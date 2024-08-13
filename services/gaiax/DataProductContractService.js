const GaiaXService = require("./GaiaXService");
const DataProductService = require("./DataProductService");
const ThirdPartyTokenService = require("../ThirdPartyTokenService");
const RemoteParticipantValidator = require("../../validators/RemoteParticipantValidator");
const RemoteDidValidator = require("../../validators/RemoteDidValidator");
const DataProductContract = require('../../models/DataProductContract');
const {NotFoundError} = require("objection");
const Utils = require("../../source/Utils");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require('uuid');
const Errors = require("../../source/Errors");
const path = require("path");
const fs = require("fs");
const ParticipantStorage = require("../../source/helpers/gaiax/ParticipantStorage");
const os = require("os");
const DidService = require("./DidService");

/**
 * Service for creating DataProducts
 */
class DataProductContractService {

    static DIRNAME_CONTRACT_STORAGE = 'contract_storage';

    /**
     * Define access token validity to 10 minutes
     *
     * @type {int}
     */
    static SECS_ACCESS_TOKEN_VALIDITY = 600;

    /**
     * Creates a DataProduct contract proposal and returns it
     *
     * @param {DataProduct} dataProduct
     * @param {object} inputData
     * @returns {Promise<[DataProductContract, object]>}
     */
    static async createContractProposal(dataProduct, inputData) {
        const participantSlug = dataProduct['participant']['slug'];

        let participant = await this.getParticipant(inputData['participantUrl']);
        const did = participant['issuer'];
        const didUrl = this.resolveDidUrl(did);
        const didJson = await this.getDidDocument(didUrl);

        if(did !== didJson['id']) {
            throw new Errors.ClientError("The DID document DID doesn't match the Participant issuer DID");
        }

        if(did + '#JWK2020-RSA' !== didJson['verificationMethod'][0]['id']) {
            throw new Errors.ClientError("The DID document ID the verification method DID");
        }
        const certificateUrl = didJson['verificationMethod'][0]['publicKeyJwk']['x5u'];
        const certificate = await this.getCertificate(certificateUrl);

        if(! await GaiaXService.verifyCredential(participant, crypto.createPublicKey(certificate))){
            throw new Errors.ClientError("Failed to verify the participant signature");
        }
        let contractProposal = await GaiaXService.createDataProductUsageContract(
            participantSlug,
            inputData['participantUrl'],
            this.getTermsOfUsageUrl(participantSlug, dataProduct.id)
        );

        let dataProductContract = await DataProductContract.query()
            .insert({
                id: uuidv4(),
                state: DataProductContract.STATE_CONSUMER_SIGNATURE_PENDING,
                data_product_id: dataProduct['id'],
                consumer_participant: inputData['participantUrl'],
                consumer_did: did,
                proposal_fingerprint: await GaiaXService.computeCredentialHashRaw(contractProposal),
                consumer_participant_fingerprint: await GaiaXService.computeCredentialHashRaw(participant),
                consumer_did_fingerprint: await GaiaXService.computeCredentialHashRaw(didJson),
                consumer_certificate_fingerprint: crypto.createHash("sha256").update(certificate).digest('hex'),
            });

        return [dataProductContract, contractProposal];
    }

    /**
     * Verifies consumer's signature on a contract
     *
     * @param {object} contractCredential
     * @param {DataProductContract} dataProductContract
     * @returns {Promise<DataProductContract>}
     */
    static async verifyContractSignatureAndStore(contractCredential, dataProductContract) {
        if(await GaiaXService.computeCredentialHash(contractCredential) !== dataProductContract.proposal_fingerprint) {
            throw new Errors.ClientError("Contract has been tampered with.");
        }

        await this.verifyContractSignature(contractCredential, dataProductContract);
        this.storeContract(dataProductContract.id, contractCredential);

        return DataProductContract.query()
            .patchAndFetchById(dataProductContract.id, {
                state: DataProductContract.STATE_PRODUCER_SIGNATURE_PENDING,
                consumer_proof_signature: contractCredential['proof'][0]['jws'],
                updated_at: new Date(),
            });
    }

    /**
     * Co-signs the contract with data producer key
     *
     * @param {DataProductContract} dataProductContract
     * @param {string} privateKey
     * @returns {Promise<DataProductContract>}
     */
    static async signContract(dataProductContract, privateKey) {
        let storedCredential = JSON.parse(this.readContract(dataProductContract.id));
        let storedCredentialWithoutProof = {...storedCredential};
        delete storedCredentialWithoutProof['proof'];

        let signedCredential = await GaiaXService.signCredential(
            dataProductContract['data_product']['participant']['slug'],
            JSON.stringify(storedCredentialWithoutProof),
            privateKey
        );

        // copy the proof over to the original credential
        storedCredential['proof'].push(JSON.parse(signedCredential)['proof']);
        this.storeContract(dataProductContract.id, storedCredential);

        return DataProductContract.query().patchAndFetchById(dataProductContract.id, {
            state: DataProductContract.STATE_READY_TO_BE_CLAIMED,
            updated_at: new Date(),
        });
    }

    /**
     * Verifies provided contract and issues an access token
     *
     * @param {object} contractCredential
     * @returns {Promise<ThirdPartyToken>}
     */
    static async issueAccessToken(contractCredential)
    {
        let hash = await GaiaXService.computeCredentialHash(contractCredential);
        let dataContract;
        try {
            dataContract = await DataProductContract.query()
                .where('proposal_fingerprint', hash)
                .withGraphFetched('data_product.participant')
                .first()
                .throwIfNotFound();
        } catch (e) {
            if (e instanceof NotFoundError) {
                throw new Errors.AuthenticationError("Unable to verify the contract");
            }
        }

        if(dataContract['state'] !== DataProductContract.STATE_FINALIZED) {
            throw new Errors.ClientError("The contract has not been finalized yet");
        }

        let consumerIndex = dataContract['consumer_did'] + '#JWK2020-RSA' === contractCredential['proof'][0]['verificationMethod'] ? 0 : 1;
        let producerIndex = 1 - consumerIndex;

        // verify consumer signature
        await this.verifyContractSignature(contractCredential, dataContract, consumerIndex);

        // verify producer signature
        contractCredential['proof'] = contractCredential['proof'][producerIndex];
        let certificateChain = await ParticipantStorage.readFile(dataContract['data_product']['participant']['slug'], DidService.CERT_NAME);
        let certificate = certificateChain.split(os.EOL + os.EOL)[0];
        if (! await GaiaXService.verifyCredential(contractCredential, crypto.createPublicKey(certificate))) {
            throw new Errors.ClientError("Couldn't verify the contract's signature");
        }

        let validTill = new Date();
        validTill.setSeconds(new Date().getSeconds() + this.SECS_ACCESS_TOKEN_VALIDITY);
        return ThirdPartyTokenService.store({
            active: true,
            validTill: validTill,
            route: dataContract['data_product']['route'],
        });
    }

    /**
     * Reads and parses the signed contract
     *
     * @param {DataProductContract} dataProductContract
     * @returns {Promise<object>}
     */
    static async getContract(dataProductContract) {
        let contractCredential = JSON.parse(this.readContract(dataProductContract.id));

        await DataProductContract.query().patchAndFetchById(dataProductContract.id, {
            state: DataProductContract.STATE_FINALIZED,
            updated_at: new Date(),
        });

        return contractCredential;
    }

    /**
     * Removes the contract from the storage and sets the status to rejected
     *
     * @param {DataProductContract} dataProductContract
     * @returns {Promise<DataProductContract>}
     */
    static async rejectContract(dataProductContract) {
        // nothing to remove if consumer signature is pending
        if(dataProductContract.state !== DataProductContract.STATE_CONSUMER_SIGNATURE_PENDING) {
            this.removeContract(dataProductContract.id);
        }

        return DataProductContract.query().patchAndFetchById(dataProductContract.id, {
            state: DataProductContract.STATE_REJECTED,
            updated_at: new Date(),
        });
    }

    /**
     * Returns a URL for the terms and conditions document
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @returns {string}
     */
    static getTermsOfUsageUrl(participantSlug, uuid) {
        return`${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${uuid}/${DataProductService.FILENAME_TERMS_AND_CONDITIONS}`;
    }

    /**
     * Returns and validates the Participant URL
     *
     * @param {string} participantUrl
     * @param {boolean} skipValidation
     * @returns {Promise<object>}
     */
    static async getParticipant(participantUrl, skipValidation = false) {
        let parsed = await this.getAJsonDocument(
            participantUrl,
            "Unable to fetch the Participant credential.",
            "The participant credential is not a valid JSON document."
        );

        if(skipValidation) {
            return parsed;
        }

        let participant;
        try{
            participant = await RemoteParticipantValidator.getValidatedData(parsed);
        }catch (e) {
            e["customMessage"] = 'The Participant credential is invalid';
            throw e;
        }
        let did = participant["issuer"];

        if (did + '#JWK2020-RSA' !== participant['proof']['verificationMethod']) {
            throw new Errors.ClientError("The participant verification method doesn't match the issuer.");
        }

        return parsed;
    }

    /**
     * Returns and validates the DID document
     *
     * @param {string} didUrl
     * @param {boolean} skipValidation
     * @returns {Promise<object>}
     */
    static async getDidDocument(didUrl, skipValidation = false) {
        let parsed = await this.getAJsonDocument(
            didUrl,
            "Unable to fetch the DID document.",
            "The DID is not a valid JSON document."
        );
        if (skipValidation) {
            return parsed;
        }

        try{
            await RemoteDidValidator.getValidatedData(parsed);
        }catch (e) {
            e["customMessage"] = 'The DID document is invalid';
            throw e;
        }

        return parsed;
    }

    /**
     * Returns the certificate extracted from DID
     *
     * @param {string} certUrl
     * @returns {Promise<string>}
     */
    static async getCertificate(certUrl) {
        let response;
        try {
            response = (await (axios.get(certUrl, {responseType: "text"}))).data;
        } catch (e) {
            if (e instanceof axios.AxiosError) {
                throw new Errors.ClientError("Unable to fetch the DID certificate");
            }

            throw e;
        }
        let certs = response.match(/-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/g);
        if(! certs) {
            throw new Errors.ClientError("Unable to extract the DID certificate");
        }

        return certs[0];
    }

    /**
     * Resolves a DID value to the document URL
     *
     * @param {string} did
     */
    static resolveDidUrl(did) {
        let urlFragments = did.replace('did:web:', '').split(':');
        if(urlFragments.length < 2) {
            urlFragments.push('.well-known');
        }
        urlFragments.push('did.json');
        return 'https://' + urlFragments.join('/').replace('%3A', ':');
    }

    /**
     * Performs a GET request to the provided url and tries to parse the response as JSON
     *
     * @param {string} url
     * @param {string} fetchErrorMessage
     * @param {string} parseErrorMessage
     * @returns {Promise<object>}
     */
    static async getAJsonDocument(url, fetchErrorMessage, parseErrorMessage) {
        let response;
        try {
            response = (await axios.get(url, {responseType: "text"})).data;
        } catch (e) {
            if (e instanceof axios.AxiosError) {
                throw new Errors.ClientError(fetchErrorMessage);
            }

            throw e;
        }

        try {
            return JSON.parse(response);
        }catch (e) {
            if (e instanceof SyntaxError) {
                throw new Errors.ClientError(parseErrorMessage);
            }

            throw e;
        }
    }


    /**
     * Verifies consumer's signature on a contract
     *
     * @param {object} contractCredential
     * @param {DataProductContract} dataProductContract
     * @param {int} proofIndex
     * @returns {Promise<void>}
     */
    static async verifyContractSignature(
        contractCredential,
        dataProductContract,
        proofIndex = 0
    ) {
        if(contractCredential['proof'][proofIndex]['verificationMethod'] !== dataProductContract.consumer_did + '#JWK2020-RSA') {
            throw new Errors.ClientError("Signer's DID doesn't match the DID of the participant the contract was issued for.");
        }

        const participant = await this.getParticipant(dataProductContract.consumer_participant, true);
        if(await GaiaXService.computeCredentialHashRaw(participant) !== dataProductContract.consumer_participant_fingerprint) {
            throw new Errors.ClientError("Participant credential has been tampered with.");
        }

        const didJson = await this.getDidDocument(this.resolveDidUrl(dataProductContract.consumer_did), true);
        if(await GaiaXService.computeCredentialHashRaw(didJson) !== dataProductContract.consumer_did_fingerprint) {
            throw new Errors.ClientError("DID document has been tampered with.");
        }

        const certificateUrl = didJson['verificationMethod'][0]['publicKeyJwk']['x5u'];
        const certificate = await this.getCertificate(certificateUrl);
        const certificateHash = crypto.createHash("sha256").update(certificate).digest('hex');

        if(certificateHash !== dataProductContract.consumer_certificate_fingerprint) {
            throw new Errors.ClientError("DID certificate has been tampered with.");
        }

        // unpack the proof signature
        let clonedContract = {...contractCredential};
        clonedContract['proof'] = clonedContract['proof'][proofIndex];
        if(! await GaiaXService.verifyCredential(clonedContract, crypto.createPublicKey(certificate))){
            throw new Errors.ClientError("Failed to verify the contract signature");
        }
    }

    /**
     * Store a signed contract credential
     *
     * @param {string} contractUuid
     * @param {object} contractCredential
     * @returns {void}
     */
    static storeContract(contractUuid, contractCredential) {
        let contractPath = path.join(Utils.getProjectPath(), this.DIRNAME_CONTRACT_STORAGE, contractUuid);
        let dirPath = path.dirname(contractPath);
        if(! fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, {recursive: true});
        }

        fs.writeFileSync(contractPath, JSON.stringify(contractCredential, null, '  '));
    }

    /**
     * Reads a contract from the storage
     *
     * @param {string} contractUuid
     * @returns {string}
     */
    static readContract(contractUuid) {
        let contractPath = path.join(Utils.getProjectPath(), this.DIRNAME_CONTRACT_STORAGE, contractUuid);

        return fs.readFileSync(contractPath, "utf8");
    }

    /**
     * Removes a contract from the storage
     *
     * @param {string} contractUuid
     */
    static removeContract(contractUuid) {
        let contractPath = path.join(Utils.getProjectPath(), this.DIRNAME_CONTRACT_STORAGE, contractUuid);

        return fs.rmSync(contractPath);
    }
}

module.exports = DataProductContractService;

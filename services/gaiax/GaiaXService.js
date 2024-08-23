const fs = require("fs");
const path = require("path");
const mustache = require("mustache");
const moment = require("moment");
const crypto = require("crypto");
const axios = require("axios");
const jsonld = require("jsonld");
const jose = require("jose");
const ParticipantStorage = require("../../source/helpers/gaiax/ParticipantStorage");
const DidService = require("./DidService");
const Utils = require("../../source/Utils");
const Errors = require("../../source/Errors");
const { v4: uuidv4 } = require('uuid');
const {JWSSignatureVerificationFailed} = require("jose/errors");

class GaiaXCredentialService {

    /**
     * Store credential names
     */
    static CREDENTIAL_NAME_T_AND_C = "terms-and-conditions";
    static CREDENTIAL_NAME_LRN = "legal-registration-number";
    static CREDENTIAL_NAME_PARTICIPANT = "participant";
    static CREDENTIAL_NAME_COMPLIANCE = "compliance";
    static CREDENTIAL_NAME_DATA_RESOURCE = "data-resource";
    static CREDENTIAL_NAME_SERVICE_OFFERING = "service-offering";
    static CREDENTIAL_NAME_DATA_PRODUCT_DESCRIPTION = "data-product-description";
    static CREDENTIAL_NAME_DATASET_DESCRIPTION = "dataset-description";
    static CREDENTIAL_NAME_DATA_USAGE = "data-usage";
    static CREDENTIAL_NAME_SOFTWARE_RESOURCE = "software-resource";
    static CREDENTIAL_NAME_INSTANTIATED_VIRTUAL_RESOURCE = "instantiated-virtual-resource";

    /**
     * Insert URLs to Gaia-X credentials to the Participant object
     *
     * @param {Participant} participant
     * @returns {Participant}
     */
    static embedParticipantUrls(participant) {
        participant["urls"] = [
            this.getCredentialId(participant['slug'], this.CREDENTIAL_NAME_T_AND_C),
            this.getCredentialId(participant['slug'], this.CREDENTIAL_NAME_LRN),
            this.getCredentialId(participant['slug'], this.CREDENTIAL_NAME_PARTICIPANT),
            this.getCredentialId(participant['slug'], this.CREDENTIAL_NAME_COMPLIANCE),
        ];
        return participant;
    }

    /**
     * Insert URLs to Gaia-X credentials to the DataProducts object
     *
     * @param {DataProduct} dataProduct
     * @returns {DataProduct}
     */
    static embedDataProductUrls(dataProduct) {
        let slug = dataProduct['participant']['slug'];
        dataProduct["urls"] = [
            this.getCredentialId(slug, this.CREDENTIAL_NAME_DATA_RESOURCE, dataProduct.id),
            this.getCredentialId(slug, this.CREDENTIAL_NAME_SERVICE_OFFERING, dataProduct.id),
            this.getCredentialId(slug, this.CREDENTIAL_NAME_DATA_PRODUCT_DESCRIPTION, dataProduct.id),
            this.getCredentialId(slug, this.CREDENTIAL_NAME_DATASET_DESCRIPTION, dataProduct.id),
            this.getCredentialId(slug, this.CREDENTIAL_NAME_DATA_USAGE, dataProduct.id),
            this.getCredentialId(slug, this.CREDENTIAL_NAME_SOFTWARE_RESOURCE, dataProduct.id),
            this.getCredentialId(slug, this.CREDENTIAL_NAME_INSTANTIATED_VIRTUAL_RESOURCE, dataProduct.id),
        ];
        delete dataProduct['participant'];
        return dataProduct;
    }

    /**
     * Create and sign the "GaiaXTermsAndConditions" credential
     *
     * @param {string} participantSlug
     * @param {string} privateKey
     * @returns {Promise<void>}
     */
    static async issueTermsAndConditions(participantSlug, privateKey) {
        const name = this.CREDENTIAL_NAME_T_AND_C;
        let termsAndCondsTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/terms-and-conditions.mustache"),
            "utf8"
        );
        let termsAndConditions = mustache.render(termsAndCondsTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name),
            "subject_id": this.getCredentialSubject(participantSlug, name),
            "issuance_date": this.getIssuanceDateNow(),
        });
        termsAndConditions = await this.signCredential(participantSlug, termsAndConditions, privateKey);
        await ParticipantStorage.storeFile(participantSlug, name + '.json', termsAndConditions);
    }

    /**
     * Send request to Gaia-X notary to have legal registration number credential issued
     *
     * @param {string} participantSlug
     * @param {string} vatId
     * @returns {Promise<void>}
     */
    static async issueLegalRegistrationNumber(participantSlug, vatId) {
        const name = this.CREDENTIAL_NAME_LRN;
        let legalRegistrationNumberTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/lrn-request.mustache"),
            "utf8"
        );

        let legalRegistrationNumberRequest = mustache.render(legalRegistrationNumberTemplate, {
            "subject_id": this.getCredentialSubject(participantSlug, name),
            "vat_id": vatId,
        });

        const url = `${Utils.getEnvVar("NOTARY_URL")}?vcid=${this.getCredentialId(participantSlug, name)}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        let response;
        try {
            response = await axios.post(url, legalRegistrationNumberRequest, {headers: headers});
        } catch (e) {
            if (e instanceof axios.AxiosError && e.response) {
                throw new Errors.GXRemoteServiceError("Legal Registration Number call request failed.", e.response.status, e.response.data);
            }

            throw e;
        }

        await ParticipantStorage.storeFile(participantSlug, name + '.json', JSON.stringify(response.data, null, "  "));
    }

    /**
     * Create and sign the "LegalParticipant" credential
     *
     * @param {string} participantSlug
     * @param {string} privateKey
     * @param {string} legalName
     * @param {string} countryCode
     * @returns {Promise<void>}
     */
    static async issueParticipant(participantSlug, privateKey, legalName, countryCode) {
        const name = this.CREDENTIAL_NAME_PARTICIPANT;
        let participantTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/participant.mustache"),
            "utf8"
        );
        let participant = mustache.render(participantTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name),
            "subject_id": this.getCredentialSubject(participantSlug, name),
            "issuance_date": this.getIssuanceDateNow(),
            "lrn_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_LRN),
            "legal_name": legalName,
            "country_code": countryCode,
        });
        participant = await this.signCredential(participantSlug, participant, privateKey);
        await ParticipantStorage.storeFile(participantSlug, name + '.json', participant);
    }

    /**
     * Send request to Gaia-X compliance service to have Participant, T&C and LRN credentials validated and signed
     *
     * @param {string} participantSlug
     * @returns {Promise<void>}
     */
    static async issueCompliance(participantSlug) {
        const name = this.CREDENTIAL_NAME_COMPLIANCE;
        let complianceTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/verifiable-presentation.mustache"),
            "utf8"
        );

        let complianceRequest = mustache.render(complianceTemplate, {
            "legal_registration_number": await ParticipantStorage.readFile(participantSlug, "legal-registration-number.json"),
            "terms_and_conditions": await ParticipantStorage.readFile(participantSlug, "terms-and-conditions.json"),
            "participant": await ParticipantStorage.readFile(participantSlug, "participant.json"),
        });

        const url = `${Utils.getEnvVar("COMPLIANCE_URL")}?vcid=${this.getCredentialId(participantSlug, name)}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        let response;
        try {
            response = await axios.post(url, complianceRequest, {headers: headers});
        } catch (e) {
            if (e instanceof axios.AxiosError && e.response) {
                throw new Errors.GXRemoteServiceError("Compliance call request failed.", e.response.status, e.response.data);
            }

            throw e;
        }

        await ParticipantStorage.storeFile(participantSlug, name + '.json', JSON.stringify(response.data, null, "  "));
    }

    /**
     * Create and sign the "DataResource" credential
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} dataResourceTitle
     * @param {string} dataResourceDescription
     * @param {string} datasetUrl
     * @param {string} privateKey
     * @param {string} policy
     * @param {string} licenseUrl
     * @returns {Promise<void>}
     */
    static async issueDataResource(
        participantSlug,
        uuid,
        dataResourceTitle,
        dataResourceDescription,
        datasetUrl,
        policy,
        licenseUrl,
        privateKey
    ) {
        const name = this.CREDENTIAL_NAME_DATA_RESOURCE;

        let dataResourceTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/data-resource.mustache"),
            "utf8"
        );
        let dataResource = mustache.render(dataResourceTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, uuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, uuid),
            "issuance_date": this.getIssuanceDateNow(),
            "participant_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_PARTICIPANT),
            "data_resource_title": dataResourceTitle,
            "data_resource_description": dataResourceDescription,
            "instantiated_virtual_resource_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_INSTANTIATED_VIRTUAL_RESOURCE, uuid),
            "policy_contents": datasetUrl,
            "license_url": datasetUrl,
        });
        dataResource = await this.signCredential(participantSlug, dataResource, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${uuid}/${name}.json`, dataResource);
    }

    /**
     * Create and sign the "ServiceOffering" credential
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} serviceOfferingName
     * @param {string} termsAndConditionsUrl
     * @param {string} termsAndConditionsHash
     * @param {string} policy
     * @param {string} privateKey
     * @returns {Promise<void>}
     */
    static async issueDataServiceOffering(
        participantSlug,
        uuid,
        serviceOfferingName,
        termsAndConditionsUrl,
        termsAndConditionsHash,
        policy,
        privateKey
    ) {
        const name = this.CREDENTIAL_NAME_SERVICE_OFFERING;

        let serviceOfferingTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/service-offering.mustache"),
            "utf8"
        );
        let serviceOffering = mustache.render(serviceOfferingTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, uuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, uuid),
            "issuance_date": this.getIssuanceDateNow(),
            "participant_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_PARTICIPANT),
            "data_resource_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_DATA_RESOURCE, uuid),
            "terms_and_conditions_url": termsAndConditionsUrl,
            "terms_and_conditions_hash": termsAndConditionsHash,
            "service_offering_name": serviceOfferingName,
            "policy_contents": policy
        });
        serviceOffering = await this.signCredential(participantSlug, serviceOffering, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${uuid}/${name}.json`, serviceOffering);
    }

    /**
     * Create and sign the "DataProductDescription" credential
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} dataProductTitle
     * @param {string|null} dataProductDescription
     * @param {string} termsAndConditionsUrl
     * @param {string} termsAndConditionsHash
     * @param {string} licenseUrl
     * @param {string} policy
     * @param {Date|null} obsoleteDate
     * @param {string} privateKey
     * @returns {Promise<void>}
     */
    static async issueDataProductDescription(
        participantSlug,
        uuid,
        dataProductTitle,
        dataProductDescription,
        termsAndConditionsUrl,
        termsAndConditionsHash,
        licenseUrl,
        policy,
        obsoleteDate,
        privateKey
    ) {
        const name = this.CREDENTIAL_NAME_DATA_PRODUCT_DESCRIPTION;

        let dataProductDescriptionTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/data-product-description.mustache"),
            "utf8"
        );
        let dataProductDescriptionCredential = mustache.render(dataProductDescriptionTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, uuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, uuid),
            "issuance_date": this.getIssuanceDateNow(),
            "participant_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_PARTICIPANT),
            "dataset_description_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_DATASET_DESCRIPTION, uuid),
            "terms_and_conditions_url": termsAndConditionsUrl,
            "terms_and_conditions_hash": termsAndConditionsHash,
            "data_product_title": dataProductTitle,
            "data_product_description": dataProductDescription,
            "license_url": licenseUrl,
            "policy_contents": policy,
            "obsolete_date": obsoleteDate ? moment(obsoleteDate).toISOString(true) : null,
            "uuid": uuid,
        });

        dataProductDescriptionCredential = await this.signCredential(participantSlug, dataProductDescriptionCredential, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${uuid}/${name}.json`, dataProductDescriptionCredential);
    }

    /**
     * Create and sign the "DatasetDescription" credential
     *
     * @param {string} participantSlug
     * @param {string} dataProductUuid
     * @param {string} datasetTitle
     * @param {string} dataResourceUrl
     * @param {string|null} datasetLicenseUrl
     * @param {string|null} datasetLanguage
     * @param {Date|null} datasetIssuanceDate
     * @param {Date|null} datasetExpirationDate
     * @param {string} privateKey
     * @returns {Promise<string>}
     */
    static async issueDatasetDescription(
        participantSlug,
        dataProductUuid,
        datasetTitle,
        dataResourceUrl,
        datasetLicenseUrl,
        datasetLanguage,
        datasetIssuanceDate,
        datasetExpirationDate,
        privateKey
    ) {
        const name = this.CREDENTIAL_NAME_DATASET_DESCRIPTION;
        const uuid = uuidv4();

        let datasetDescriptionTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/dataset-description.mustache"),
            "utf8"
        );
        let datasetDescription = mustache.render(datasetDescriptionTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, dataProductUuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, dataProductUuid),
            "issuance_date": this.getIssuanceDateNow(),
            "dataset_title": datasetTitle,
            "distribution_title": datasetTitle,
            "dataset_license_url": datasetLicenseUrl,
            "dataset_issuance_date": datasetIssuanceDate ? moment(datasetIssuanceDate).toISOString(true) : null,
            "dataset_expiration_date": datasetExpirationDate ? moment(datasetExpirationDate).toISOString(true) : null,
            "dataset_language": datasetLanguage,
            "instantiated_virtual_resource_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_INSTANTIATED_VIRTUAL_RESOURCE, dataProductUuid),
            "uuid": uuid,
        });

        datasetDescription = await this.signCredential(participantSlug, datasetDescription, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${dataProductUuid}/${name}.json`, datasetDescription);

        return uuid;
    }

    /**
     * Create and sign the "SoftwareResource" credential
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} privateKey
     * @returns {Promise<void>}
     */
    static async issueSoftwareResource(
        participantSlug,
        uuid,
        privateKey
    ) {
        const name = this.CREDENTIAL_NAME_SOFTWARE_RESOURCE;

        let softwareResourceTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/software-resource.mustache"),
            "utf8"
        );
        let softwareResource = mustache.render(softwareResourceTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, uuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, uuid),
            "issuance_date": this.getIssuanceDateNow(),
        });

        softwareResource = await this.signCredential(participantSlug, softwareResource, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${uuid}/${name}.json`, softwareResource);
    }

    /**
     * Create and sign the "InstantiatedVirtualResource" credential
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} endpointRoute
     * @param {string} privateKey
     * @returns {Promise<void>}
     */
    static async issueInstantiatedVirtualResource(
        participantSlug,
        uuid,
        endpointRoute,
        privateKey
    ) {
        const name = this.CREDENTIAL_NAME_INSTANTIATED_VIRTUAL_RESOURCE;

        let instantiatedVirtualResourceTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/instantiated-virtual-resource.mustache"),
            "utf8"
        );
        let instantiatedVirtualResource = mustache.render(instantiatedVirtualResourceTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, uuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, uuid),
            "issuance_date": this.getIssuanceDateNow(),
            "participant_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_PARTICIPANT),
            "software_resource_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_SOFTWARE_RESOURCE, uuid),
            "data_resource_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_DATA_RESOURCE, uuid),
            "endpoint_route": this.getIssuanceDateNow(),
            "domain_name": Utils.getDomain(),
        });

        instantiatedVirtualResource = await this.signCredential(participantSlug, instantiatedVirtualResource, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${uuid}/${name}.json`, instantiatedVirtualResource);
    }

    /**
     * Create and sign the "DataUsage" credential
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} privateKey
     * @returns {Promise<void>}
     */
    static async issueDataUsage(participantSlug, uuid, privateKey) {
        const name = this.CREDENTIAL_NAME_DATA_USAGE;

        let dataUsageTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/data-usage.mustache"),
            "utf8"
        );
        let dataUsageCredential = mustache.render(dataUsageTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name, uuid),
            "subject_id": this.getCredentialSubject(participantSlug, name, uuid),
            "issuance_date": this.getIssuanceDateNow(),
        });
        dataUsageCredential = await this.signCredential(participantSlug, dataUsageCredential, privateKey);
        await ParticipantStorage.storeFile(participantSlug, `${uuid}/${name}.json`, dataUsageCredential);
    }

    /**
     * Create and sign the "DataProductUsageContract" credential
     *
     * @param {string} participantSlug
     * @param {string} consumerCsId
     * @param {string} termsOfUsage
     * @param {string} contractUuid
     * @param {string} dataProductUuid
     * @returns {Promise<any>}
     */
    static async createDataProductUsageContract(
        participantSlug,
        consumerCsId,
        termsOfUsage,
        contractUuid,
        dataProductUuid
    ) {
        let dataProductDescriptionTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/data-product-usage-contract.mustache"),
            "utf8"
        );

        return JSON.parse(mustache.render(dataProductDescriptionTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, contractUuid),
            "subject_id": this.getCredentialSubject(participantSlug, contractUuid),
            "issuance_date": this.getIssuanceDateNow(),
            "provider_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_PARTICIPANT),
            "consumer_cs_id": consumerCsId,
            "data_product_description_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_DATA_PRODUCT_DESCRIPTION, dataProductUuid),
            "data_product_terms_of_usage": termsOfUsage,
            "data_usage_cs_id": this.getCredentialSubject(participantSlug, this.CREDENTIAL_NAME_DATA_USAGE, dataProductUuid),
        }));
    }

    /**
     * Normalizes provided credential and computes its hash
     *
     * @param {object} credential
     * @returns {Promise<string>}
     */
    static async computeCredentialHash(credential) {
        let credentialCopy = credential;
        // omit proof from hash calculation
        if ('proof' in credential) {
            credentialCopy = {...credential};
            delete credentialCopy['proof'];
        }
        return this.computeCredentialHashRaw(credentialCopy);
    }

    /**
     * Computes a hash of provided credential; skips proof checks (computes hash of the whole credential, not just body)
     *
     * @param credential
     * @returns {Promise<string>}
     */
    static async computeCredentialHashRaw(credential) {
        // normalize from JSON-LD to RDF
        const normalized = await jsonld.normalize(
            credential,
            {algorithm: 'URDNA2015', format: 'application/n-quads'}
        );

        // compute hash of the credential
        return crypto.createHash("sha256").update(normalized).digest('hex');
    }

    /**
     * Signs the given Gaia-X credential and returns it
     *
     * @param {string} participantSlug
     * @param {string} credential
     * @param {string} privateKey
     * @returns {Promise<string>}
     */
    static async signCredential(participantSlug, credential, privateKey) {
        let parsedCredential = JSON.parse(credential);

        // create and sign the hash of the credential
        const hash = await this.computeCredentialHash(parsedCredential);
        const jws = await new jose.CompactSign(new TextEncoder().encode(hash))
            .setProtectedHeader({"alg": "PS256", "b64": false, "crit": ["b64"]})
            .sign(crypto.createPrivateKey(privateKey));

        parsedCredential["proof"] = {
            "created": this.getIssuanceDateNow(),
            "type": "JsonWebSignature2020",
            "proofPurpose": "assertionMethod",
            "verificationMethod": DidService.getDidWithVerification(participantSlug),
            "jws": jws
        };

        return JSON.stringify(parsedCredential, null, "  ");
    }

    /**
     * Verifies the credential's signature
     *
     * @param {object} credential
     * @param {KeyObject} publicKey
     * @returns {Promise<boolean>}
     */
    static async verifyCredential(credential, publicKey) {
        let jwsExploded = credential['proof']['jws'].split('.');
        const hash = await this.computeCredentialHash(credential);

        try {
            await jose.flattenedVerify(
                {
                    protected: jwsExploded[0],
                    payload: new TextEncoder().encode(hash),
                    signature: jwsExploded[2]
                },
                publicKey
            );
        }catch (e) {
            if(e instanceof  JWSSignatureVerificationFailed){
                return false;
            }

            throw e;
        }

        return true;
    }

    /**
     * Returns current date formatted as ISO string
     *
     * @returns {string}
     */
    static getIssuanceDateNow() {
        return moment().toISOString(true);
    }

    /**
     * Returns URL to a credential document based on participant and credential name
     *
     * @param {string} participantSlug
     * @param {string} credentialName
     * @param {string|null} dataProductUuid if the parameter is provided, the URL point to credential inside the Participant's data dir, else the URL points to the credential inside Participant's base dir
     * @returns {string}
     */
    static getCredentialId(participantSlug, credentialName, dataProductUuid = null) {
        const dataProductInfix = dataProductUuid ? dataProductUuid + "/" : "";
        return `${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${dataProductInfix}${credentialName}.json`;
    }

    /**
     * Returns credential subject URL of a credential document base on participant and credential name
     *
     * @param {string} participantSlug
     * @param {string} credentialName
     * @param {string|null} dataProductUuid if the parameter is provided, the URL point to credential inside the Participant's data dir, else the URL points to the credential inside Participant's base dir
     * @returns {string}
     */
    static getCredentialSubject(participantSlug, credentialName, dataProductUuid = null) {
        return this.getCredentialId(participantSlug, credentialName, dataProductUuid) + "#cs";
    }
}

module.exports = GaiaXCredentialService;
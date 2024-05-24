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
const logger = require("../../source/Loggers");
const util = require("util");

class GaiaXCredentialService {

    /**
     * Create and sign the "GaiaXTermsAndConditions" credential
     *
     * @param {string} participantSlug
     * @param {string} privateKey
     * @returns {Promise<string>} link to the credential
     */
    static async issueTermsAndConditions(participantSlug, privateKey) {
        const name = 'terms-and-conditions';
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

        return this.getCredentialId(participantSlug, name);
    }

    /**
     * Send request to Gaia-X notary to have legal registration number credential issued
     *
     * @param {string} participantSlug
     * @param {string} vatId
     * @returns {Promise<string>} link to the credential
     */
    static async issueLegalRegistrationNumber(participantSlug, vatId) {
        const name = 'legal-registration-number';
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
            logger.error(JSON.stringify(util.inspect(e), null, 2));
            console.log(e);
            throw e;
        }

        await ParticipantStorage.storeFile(participantSlug, name + '.json', JSON.stringify(response.data, null, "  "));

        return this.getCredentialId(participantSlug, name);
    }

    /**
     * Create and sign the "LegalParticipant" credential
     *
     * @param {string} participantSlug
     * @param {string} privateKey
     * @param {string} legalName
     * @param {string} countryCode
     * @returns {Promise<string>} link to the credential
     */
    static async issueParticipant(participantSlug, privateKey, legalName, countryCode) {
        const name = 'participant';
        let participantTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/participant.mustache"),
            "utf8"
        );
        let participant = mustache.render(participantTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name),
            "subject_id": this.getCredentialSubject(participantSlug, name),
            "issuance_date": this.getIssuanceDateNow(),
            "lrn_cs_id": this.getCredentialSubject(participantSlug, "legal-registration-number"),
            "legal_name": legalName,
            "country_code": countryCode,
        });
        participant = await this.signCredential(participantSlug, participant, privateKey);
        await ParticipantStorage.storeFile(participantSlug, name + '.json', participant);

        return this.getCredentialId(participantSlug, name);
    }

    /**
     * Send request to Gaia-X notary to have legal registration number credential issued
     *
     * @param {string} participantSlug
     * @returns {Promise<string>} link to the credential
     */
    static async issueCompliance(participantSlug) {
        const name = 'compliance';
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
            logger.error(JSON.stringify(util.inspect(e), null, 2));
            console.log(e);
            throw e;
        }

        await ParticipantStorage.storeFile(participantSlug, name + '.json', JSON.stringify(response.data, null, "  "));

        return this.getCredentialId(participantSlug, name);
    }

    /**
     * Create and sign the "DataResource" credential
     *
     * @param {string} participantSlug
     * @param {string} privateKey
     * @returns {Promise<string>} link to the credential
     */
    static async issueDataResource(participantSlug, privateKey) {
        const name = 'data-resource';
        const dummyDataPath = 'data/dummy.json';
        let datasetUrl = `${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${dummyDataPath}`;
        if (process.env["DATASET_URL"]) {
            datasetUrl = process.env["DATASET_URL"];
        } else if (!await ParticipantStorage.fileExists(participantSlug, dummyDataPath)) {
            // generate dummy data
            await ParticipantStorage.storeFile(participantSlug, dummyDataPath, JSON.stringify({
                data: [
                    {
                        "patient_id": "PT001",
                        "age": 45,
                        "gender": "Male",
                        "diagnosis": "Hypertension",
                        "treatment": "Drug A",
                        "response": "Positive",
                        "duration_days": 30
                    },
                    {
                        "patient_id": "PT002",
                        "age": 32,
                        "gender": "Female",
                        "diagnosis": "Diabetes",
                        "treatment": "Drug B",
                        "response": "Negative",
                        "duration_days": 60
                    },
                    {
                        "patient_id": "PT003",
                        "age": 50,
                        "gender": "Male",
                        "diagnosis": "Arthritis",
                        "treatment": "Placebo",
                        "response": "Neutral",
                        "duration_days": 45
                    }
                ]
            }, null, "  "));
        }

        let dataResourceTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/data-resource.mustache"),
            "utf8"
        );
        let dataResource = mustache.render(dataResourceTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name),
            "subject_id": this.getCredentialSubject(participantSlug, name),
            "issuance_date": this.getIssuanceDateNow(),
            "participant_cs_id": this.getCredentialSubject(participantSlug, "participant"),
            "data_resource_url": datasetUrl,
        });
        dataResource = await this.signCredential(participantSlug, dataResource, privateKey);
        await ParticipantStorage.storeFile(participantSlug, name + '.json', dataResource);

        return this.getCredentialId(participantSlug, name);
    }

    /**
     * Create and sign the "ServiceOffering" credential
     *
     * @param {string} participantSlug
     * @param {string} privateKey
     * @returns {Promise<string>} link to the credential
     */
    static async issueDataServiceOffering(participantSlug, privateKey) {
        const name = 'service-offering';
        const termsAndConditionsPath = 'data/terms-and-conditions.txt';
        let termsAndConditionsUrl = `${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${termsAndConditionsPath}`;
        let termsAndConditions = Utils.getEnvVar("DATASET_TERMS_AND_CONDITIONS");

        // store term and conditions
        if(!await ParticipantStorage.fileExists(participantSlug, termsAndConditionsPath)) {
            await ParticipantStorage.storeFile(participantSlug, termsAndConditionsPath, termsAndConditions);
        }

        let termsAndConditionsHash = crypto.createHash("sha256").update(termsAndConditions).digest('hex');
        let serviceOfferingTemplate = fs.readFileSync(
            path.join(Utils.getCoreProjectPath(), "templates/gaiax/service-offering.mustache"),
            "utf8"
        );
        let serviceOffering = mustache.render(serviceOfferingTemplate, {
            "issuer": DidService.getDid(participantSlug),
            "credential_id": this.getCredentialId(participantSlug, name),
            "subject_id": this.getCredentialSubject(participantSlug, name),
            "issuance_date": this.getIssuanceDateNow(),
            "participant_cs_id": this.getCredentialSubject(participantSlug, "participant"),
            "data_resource_cs_id": this.getCredentialSubject(participantSlug, "data-resource"),
            "terms_and_conditions_url": termsAndConditionsUrl,
            "terms_and_conditions_hash": termsAndConditionsHash,
        });
        serviceOffering = await this.signCredential(participantSlug, serviceOffering, privateKey);
        await ParticipantStorage.storeFile(participantSlug, name + '.json', serviceOffering);

        return this.getCredentialId(participantSlug, name);
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

        // normalize from JSON-LD to RDF
        const normalized = await jsonld.normalize(
            parsedCredential,
            {algorithm: 'URDNA2015', format: 'application/n-quads'}
        );

        // create and sign the hash of the credential
        const hash = crypto.createHash("sha256").update(normalized).digest('hex');
        const jws = await new jose.CompactSign(new TextEncoder().encode(hash))
            .setProtectedHeader({"alg": "PS256", "b64": false, "crit": ["b64"]})
            .sign(crypto.createPrivateKey(privateKey));

        parsedCredential["proof"] = {
            "type": "JsonWebSignature2020",
            "proofPurpose": "assertionMethod",
            "verificationMethod": DidService.getDidWithVerification(participantSlug),
            "jws": jws
        };

        return JSON.stringify(parsedCredential, null, "  ");
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
     * @returns {string}
     */
    static getCredentialId(participantSlug, credentialName) {
        return `${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${credentialName}.json`;
    }

    /**
     * Returns credential subject URL of a credential document base on participant and credential name
     *
     * @param {string} participantSlug
     * @param {string} credentialName
     * @returns {string}
     */
    static getCredentialSubject(participantSlug, credentialName) {
        return this.getCredentialId(participantSlug, credentialName) + "#cs";
    }
}

module.exports = GaiaXCredentialService;
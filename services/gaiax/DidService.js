const os = require("os")
const crypto = require("crypto")
const {pki} = require('node-forge');
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const Utils = require("../../source/Utils");
const ParticipantStorage = require("../../source/helpers/gaiax/ParticipantStorage");

/**
 * Service for issuing and managing decentralized identifiers (https://www.w3.org/TR/did-core/)
 *
 * TODO: consider usage of the Gaia-X signer tool https://gitlab.eclipse.org/eclipse/xfsc/tsa/signer
 */
class DidService {
    /**
     * Map for translating OID to algorithm name
     *
     * @type {Record<string, string>}
     */
    static OID2ALG = {
        "1.2.840.113549.2.9": "HS256",
        "1.2.840.113549.2.10": "HS384",
        "1.2.840.113549.2.11": "HS512",
        "1.2.840.113549.1.1.11": "RS256",
        "1.2.840.113549.1.1.12": "RS384",
        "1.2.840.113549.1.1.13": "RS512",
        "1.2.840.10045.4.3.2": "ES256",
        "1.2.840.10045.4.3.3": "ES384",
        "1.2.840.10045.4.3.4": "ES512",
        "1.2.840.113549.1.1.10": "PS256"
    }

    /**
     * Participant's certificate file name
     *
     * @type {string}
     */
    static CERT_NAME = "cert.pem";

    /**
     * Participant's DID document file name
     *
     * @type {string}
     */
    static DID_NAME = "did.json";

    /**
     * DID verification method
     *
     * @type {string}
     */
    static VERIFICATION_METHOD = 'JWK2020-RSA';

    /**
     * Create the Decentralized Identifier for a given participant
     *
     * @param {string} participantSlug
     * @param {string[]} certificateChain
     * @returns {Promise<void>}
     */
    static async createDid(participantSlug, certificateChain) {

        let certObject = pki.certificateFromPem(certificateChain[0]);
        // save cert to the public directory
        await ParticipantStorage.storeFile(participantSlug, this.CERT_NAME, certificateChain.join(os.EOL + os.EOL));

        let jwk = new crypto.X509Certificate(certificateChain[0]).publicKey.export({"format": "jwk"});
        jwk["alg"] = this.OID2ALG[certObject.signatureOid];
        jwk["x5u"] = this.getCertUrl(participantSlug);

        let didTemplate = fs.readFileSync(path.join(Utils.getCoreProjectPath(), "templates/gaiax/did.mustache"), "utf8");
        let didDocument = mustache.render(didTemplate, {
            "issuer": this.getDid(participantSlug),
            "verificationMethod": this.getDidWithVerification(participantSlug),
            "jwk": jwk
        });

        await ParticipantStorage.storeFile(participantSlug, this.DID_NAME, didDocument);
    }

    /**
     * Get the Decentralized Identifier for a given participant
     *
     * @param {string} participantSlug
     */
    static getDid(participantSlug) {
        let escapedDomain = Utils.getDomain().replace(":", "%3A");
        return `did:web:${escapedDomain}:gaia-x:${participantSlug}`;
    }

    /**
     * Get the Decentralized Identifier for a given participant including verification method
     *
     * @param participantSlug
     * @returns {string}
     */
    static getDidWithVerification(participantSlug) {
        return this.getDid(participantSlug) + "#" + this.VERIFICATION_METHOD;
    }

    /**
     * Returns the URL to the certificate of a given participant
     *
     * @param {string} participantSlug
     * @returns {string}
     */
    static getCertUrl(participantSlug) {
        return Utils.getBaseUrl() + "/gaia-x/" + participantSlug + "/" + this.CERT_NAME;
    }
}

module.exports = DidService;

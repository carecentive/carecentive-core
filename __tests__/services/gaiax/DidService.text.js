const os = require("os");
const crypto = require("crypto");
const { pki } = require('node-forge');
const fs = require('fs');
const path = require('path');
const mustache = require('mustache');
const Utils = require("../../../source/Utils");
const ParticipantStorage = require("../../../source/helpers/gaiax/ParticipantStorage");
const DidService = require("../../../services/gaiax/DidService");

const VALUE_TEST_PARTICIPANT_SLUG = 'test-participant';
const VALUE_TEST_DID = 'did:web:example.com:gaia-x:test-participant';
const VALUE_TEST_DID_WITH_VERIFICATION = 'did:web:example.com:gaia-x:test-participant#JWK2020-RSA';

// mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../../source/Utils');
jest.mock('../../../source/helpers/gaiax/ParticipantStorage');

describe('DidService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createDid', () => {
        it('should create a DID for the participant and store the certificate and DID document', async () => {
            const certificateChain = ['-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhki...'];
            const mockCertObject = {
                signatureOid: '1.2.840.113549.1.1.11',
            };
            const jwk = {
                kty: "RSA",
                n: "abc123",
                e: "AQAB",
                alg: "RS256",
                x5u: 'mocked-url',
            };
            const didTemplate = 'DID_TEMPLATE_CONTENT';
            const didDocument = 'RENDERED_DID_DOCUMENT';
            const coreProjectPath = '/mock/core/project/path';

            // mock return values
            jest.spyOn(pki, 'certificateFromPem').mockReturnValue(mockCertObject);
            const mockCert = {
                publicKey: {
                    export: jest.fn().mockReturnValue(jwk)
                }
            };
            jest.spyOn(crypto, 'X509Certificate').mockImplementation(() => mockCert);
            jest.spyOn(Utils, 'getCoreProjectPath').mockReturnValue(coreProjectPath);
            fs.readFileSync.mockReturnValue(didTemplate);
            jest.spyOn(mustache, 'render').mockReturnValue(didDocument);
            jest.spyOn(DidService, 'getDid').mockReturnValue(VALUE_TEST_DID);
            jest.spyOn(DidService, 'getDidWithVerification').mockReturnValue(VALUE_TEST_DID_WITH_VERIFICATION);
            jest.spyOn(DidService, 'getCertUrl').mockReturnValue('mocked-url');

            // call tested function
            await DidService.createDid(VALUE_TEST_PARTICIPANT_SLUG, certificateChain);

            // assert correct calls
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(
                VALUE_TEST_PARTICIPANT_SLUG,
                DidService.CERT_NAME,
                certificateChain.join(os.EOL + os.EOL)
            );
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(
                VALUE_TEST_PARTICIPANT_SLUG,
                DidService.DID_NAME,
                didDocument
            );
            expect(fs.readFileSync).toHaveBeenCalledWith(
                path.join(coreProjectPath, "templates/gaiax/did.mustache"),
                "utf8"
            );
            expect(mustache.render).toHaveBeenCalledWith(didTemplate, {
                issuer: VALUE_TEST_DID,
                verificationMethod: VALUE_TEST_DID_WITH_VERIFICATION,
                jwk: jwk
            });
        });
    });

    describe('getDid', () => {
        it('should return the correct DID for a participant', () => {
            const domain = 'example.com';

            // mock Utils.getDomain return value
            jest.spyOn(Utils, 'getDomain').mockReturnValue(domain);

            // call tested function
            const result = DidService.getDid(VALUE_TEST_PARTICIPANT_SLUG);

            // assert returned value
            expect(result).toBe(VALUE_TEST_DID);
        });
    });

    describe('getDidWithVerification', () => {
        it('should return the correct DID with verification method for a participant', () => {
            // mock DidService.getDid
            jest.spyOn(DidService, 'getDid').mockReturnValue(VALUE_TEST_DID);

            // call tested function
            const result = DidService.getDidWithVerification(VALUE_TEST_PARTICIPANT_SLUG);

            // assert returned value
            expect(result).toBe(VALUE_TEST_DID_WITH_VERIFICATION);
        });
    });

    describe('getCertUrl', () => {
        it('should return the correct certificate URL for a participant', () => {
            const baseUrl = 'https://example.com';

            // mock Utils.getBaseUrl return value
            jest.spyOn(Utils, 'getBaseUrl').mockReturnValue(baseUrl);

            // call tested function
            const result = DidService.getCertUrl(VALUE_TEST_PARTICIPANT_SLUG);

            // assert returned value
            expect(result).toBe('https://example.com/gaia-x/test-participant/cert.pem');
        });
    });
});

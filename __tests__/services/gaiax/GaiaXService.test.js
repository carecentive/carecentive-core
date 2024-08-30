const fs = require('fs');
const mustache = require('mustache');
const moment = require('moment');
const crypto = require('crypto');
const axios = require('axios');
const jose = require('jose');
const {JWSSignatureVerificationFailed} = require("jose/errors");
const ParticipantStorage = require('../../../source/helpers/gaiax/ParticipantStorage');
const Utils = require('../../../source/Utils');
const GaiaXCredentialService = require('../../../services/gaiax/GaiaXService');

// mock dependencies
jest.mock('fs');
jest.mock('mustache');
jest.mock('axios');
jest.mock('jsonld');
jest.mock('jose');
jest.mock('../../../source/helpers/gaiax/ParticipantStorage');
jest.mock('../../../services/gaiax/DidService');
jest.mock('../../../source/Utils');
jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

describe('GaiaXCredentialService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('embedParticipantUrls', () => {
        it('should embed participant URLs correctly', () => {
            const participant = { slug: 'participant-slug' };

            // call tested function
            const result = GaiaXCredentialService.embedParticipantUrls(participant);

            // assert returned value
            expect(result.urls).toEqual([
                GaiaXCredentialService.getCredentialId(participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_T_AND_C),
                GaiaXCredentialService.getCredentialId(participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_LRN),
                GaiaXCredentialService.getCredentialId(participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_PARTICIPANT),
                GaiaXCredentialService.getCredentialId(participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_COMPLIANCE),
            ]);
        });
    });

    describe('embedDataProductUrls', () => {
        it('should embed data product URLs and remove participant', () => {
            let dataProduct = {
                participant: { slug: 'participant-slug' },
                id: 'data-product-uuid',
            };
            let dataProductCopy = {...dataProduct};

            // call tested function
            const result = GaiaXCredentialService.embedDataProductUrls(dataProduct);

            // assert returned value
            expect(result.urls).toEqual([
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_DATA_RESOURCE, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_SERVICE_OFFERING, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_DATA_PRODUCT_DESCRIPTION, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_DATASET_DESCRIPTION, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_DATA_USAGE, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_SOFTWARE_RESOURCE, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_INSTANTIATED_VIRTUAL_RESOURCE, dataProduct.id),
                GaiaXCredentialService.getCredentialId(dataProductCopy.participant.slug, GaiaXCredentialService.CREDENTIAL_NAME_SERVICE_ACCESS_POINT, dataProduct.id),
            ]);
            expect(result.participant).toBeUndefined();
        });
    });

    describe('issueTermsAndConditions', () => {
        it('should create and sign the "GaiaXTermsAndConditions" credential', async () => {
            const participantSlug = 'participant-slug';
            const privateKey = 'private-key';
            const templatePath = '/mock/core/project/path/templates/gaiax/terms-and-conditions.mustache';
            const renderedTemplate = 'rendered-template';
            const signedCredential = 'signed-credential';

            // mock return values
            jest.spyOn(Utils, 'getCoreProjectPath').mockReturnValue('/mock/core/project/path');
            fs.readFileSync.mockReturnValue('terms-and-conditions-template');
            mustache.render.mockReturnValue(renderedTemplate);
            jest.spyOn(GaiaXCredentialService, 'signCredential').mockResolvedValue(signedCredential);

            // call tested function
            await GaiaXCredentialService.issueTermsAndConditions(participantSlug, privateKey);

            // assert correct calls
            expect(fs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
            expect(mustache.render).toHaveBeenCalledWith('terms-and-conditions-template', expect.any(Object));
            expect(GaiaXCredentialService.signCredential).toHaveBeenCalledWith(participantSlug, renderedTemplate, privateKey);
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(participantSlug, 'terms-and-conditions.json', signedCredential);
        });
    });

    describe('issueLegalRegistrationNumber', () => {
        it('should send request to Gaia-X notary and store the credential', async () => {
            const participantSlug = 'participant-slug';
            const vatId = 'VAT123';
            const templatePath = '/mock/core/project/path/templates/gaiax/lrn-request.mustache';
            const renderedTemplate = 'rendered-template';
            const response = { data: { mock: 'response-data' } };

            // mock return values
            jest.spyOn(Utils, 'getCoreProjectPath').mockReturnValue('/mock/core/project/path');
            fs.readFileSync.mockReturnValue('lrn-request-template');
            mustache.render.mockReturnValue(renderedTemplate);
            axios.post.mockResolvedValue(response);

            // call tested function
            await GaiaXCredentialService.issueLegalRegistrationNumber(participantSlug, vatId);

            // assert correct calls
            expect(fs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
            expect(mustache.render).toHaveBeenCalledWith('lrn-request-template', expect.any(Object));
            expect(axios.post).toHaveBeenCalledWith(expect.any(String), renderedTemplate, expect.any(Object));
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(participantSlug, 'legal-registration-number.json', JSON.stringify(response.data, null, '  '));
        });
    });

    describe('issueParticipant', () => {
        it('should create and sign the "LegalParticipant" credential', async () => {
            const participantSlug = 'participant-slug';
            const privateKey = 'private-key';
            const legalName = 'Legal Name';
            const countryCode = 'DE';
            const templatePath = '/mock/core/project/path/templates/gaiax/participant.mustache';
            const renderedTemplate = 'rendered-template';
            const signedCredential = 'signed-credential';

            // mock return values
            jest.spyOn(Utils, 'getCoreProjectPath').mockReturnValue('/mock/core/project/path');
            fs.readFileSync.mockReturnValue('participant-template');
            mustache.render.mockReturnValue(renderedTemplate);
            jest.spyOn(GaiaXCredentialService, 'signCredential').mockResolvedValue(signedCredential);

            // call tested function
            await GaiaXCredentialService.issueParticipant(participantSlug, privateKey, legalName, countryCode);

            // assert correct calls
            expect(fs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
            expect(mustache.render).toHaveBeenCalledWith('participant-template', expect.any(Object));
            expect(GaiaXCredentialService.signCredential).toHaveBeenCalledWith(participantSlug, renderedTemplate, privateKey);
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(participantSlug, 'participant.json', signedCredential);
        });
    });

    describe('signCredential', () => {
        it('should sign the credential and return it with proof', async () => {
            const participantSlug = 'participant-slug';
            const credential = JSON.stringify({ mock: 'credential' });
            const privateKey = 'private-key';
            const computedHash = 'mock-hash';
            const jws = 'mock-jws';

            // mock return values
            jest.spyOn(GaiaXCredentialService, 'computeCredentialHash').mockResolvedValue(computedHash);
            jest.spyOn(crypto, 'createPrivateKey').mockReturnValue('mock-private-key');
            jest.spyOn(jose, 'CompactSign').mockReturnValue({
                setProtectedHeader: jest.fn().mockReturnThis(),
                sign: jest.fn().mockResolvedValue(jws),
            });

            // call tested function
            const result = await GaiaXCredentialService.signCredential(participantSlug, credential, privateKey);


            // assert correct calls
            expect(GaiaXCredentialService.computeCredentialHash).toHaveBeenCalledWith(expect.any(Object));
            expect(jose.CompactSign).toHaveBeenCalledWith(expect.any(Uint8Array));

            // assert returned value
            expect(result).toContain('"proof"');
            expect(result).toContain(jws);
        });
    });

    describe('verifyCredential', () => {
        it('should return true for a valid credential signature', async () => {
            const credential = { proof: { jws: 'header..signature' } };
            const publicKey = 'mock-public-key';
            const computedHash = 'mock-hash';

            // mock return values
            jest.spyOn(GaiaXCredentialService, 'computeCredentialHash').mockResolvedValue(computedHash);
            jest.spyOn(jose, 'flattenedVerify').mockResolvedValue(true);

            // call tested function
            const result = await GaiaXCredentialService.verifyCredential(credential, publicKey);

            // assert correct calls
            expect(GaiaXCredentialService.computeCredentialHash).toHaveBeenCalledWith(expect.any(Object));
            expect(jose.flattenedVerify).toHaveBeenCalledWith(expect.any(Object), publicKey);

            // assert returned value
            expect(result).toBe(true);
        });

        it('should return false if the signature verification fails', async () => {
            const credential = { proof: { jws: 'header..signature' } };
            const publicKey = 'mock-public-key';
            const computedHash = 'mock-hash';

            // mock return values
            jest.spyOn(GaiaXCredentialService, 'computeCredentialHash').mockResolvedValue(computedHash);
            jest.spyOn(jose, 'flattenedVerify').mockRejectedValue(new JWSSignatureVerificationFailed());

            // call tested function
            const result = await GaiaXCredentialService.verifyCredential(credential, publicKey);

            // assert returned value
            expect(result).toBe(false);
        });
    });

    describe('computeCredentialHash', () => {
        it('should compute the hash of the credential excluding the proof', async () => {
            const credential = { mock: 'credential', proof: 'mock-proof' };
            const computedHash = 'mock-hash';

            // mock GaiaXCredentialService.computeCredentialHashRaw return value
            jest.spyOn(GaiaXCredentialService, 'computeCredentialHashRaw').mockResolvedValue(computedHash);

            // call tested function
            const result = await GaiaXCredentialService.computeCredentialHash(credential);

            // assert returned value
            expect(result).toBe(computedHash);

            // assert correct cal to GaiaXService.computeCredentialHashRaw
            expect(GaiaXCredentialService.computeCredentialHashRaw).toHaveBeenCalledWith({ mock: 'credential' });
        });
    });

    describe('getIssuanceDateNow', () => {
        it('should return the current date as an ISO string', () => {
            const now = new Date().toISOString(true);

            // mock moment return value
            jest.spyOn(moment.prototype, 'toISOString').mockReturnValue(now);

            // call tested function
            const result = GaiaXCredentialService.getIssuanceDateNow();

            // assert returned value
            expect(result).toBe(now);
        });
    });

    describe('getCredentialId', () => {
        it('should return the correct credential URL', () => {
            const participantSlug = 'participant-slug';
            const credentialName = 'credential-name';
            const baseUrl = 'https://example.com';

            // mock Utils.getBaseUrl return value
            jest.spyOn(Utils, 'getBaseUrl').mockReturnValue(baseUrl);

            // call tested function
            const result = GaiaXCredentialService.getCredentialId(participantSlug, credentialName);

            // assert returned value
            expect(result).toBe(`${baseUrl}/gaia-x/${participantSlug}/credential-name.json`);
        });
    });

    describe('getCredentialSubject', () => {
        it('should return the correct credential subject URL', () => {
            const participantSlug = 'participant-slug';
            const credentialName = 'credential-name';
            const baseUrl = 'https://example.com';

            // mock Utils.getBaseUrl return value
            jest.spyOn(Utils, 'getBaseUrl').mockReturnValue(baseUrl);

            // call tested function
            const result = GaiaXCredentialService.getCredentialSubject(participantSlug, credentialName);

            // assert returned value
            expect(result).toBe(`${baseUrl}/gaia-x/${participantSlug}/credential-name.json#cs`);
        });
    });
});

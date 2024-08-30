const crypto = require("crypto");
const DataProduct = require("../../../models/DataProduct");
const Participant = require("../../../models/Participant");
const GaiaXService = require("../../../services/gaiax/GaiaXService");
const ParticipantStorage = require("../../../source/helpers/gaiax/ParticipantStorage");
const Utils = require("../../../source/Utils");
const { v4: uuidv4 } = require('uuid');
const GaiaXDataProductService = require("../../../services/gaiax/DataProductService");

// Mocking necessary modules and functions
jest.mock("crypto");
jest.mock("../../../models/DataProduct");
jest.mock("../../../models/Participant");
jest.mock('../../../source/Errors');
jest.mock("../../../services/gaiax/GaiaXService");
jest.mock("../../../source/helpers/gaiax/ParticipantStorage");
jest.mock("../../../source/Utils");
jest.mock('uuid', () => ({
    v4: jest.fn(),
}));

describe('DataProductService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('store', () => {
        it('should create a DataProduct and its Gaia-X credentials', async () => {
            const inputData = {
                participantId: 1,
                title: 'Data Product Title',
                description: 'Data Product Description',
                route: '/data-product-route',
                termsAndConditions: 'T&C content',
                license: 'License content',
                termsOfUsage: 'Terms of Usage content',
                policy: 'Policy content',
                dataLanguageCode: 'en',
                dataCreatedAt: new Date(),
                dataExpiresAt: new Date(),
                privateKey: 'private-key'
            };

            const participant = { id: 1, slug: 'participant-slug' };
            const dataProductUuid = 'data-product-uuid';

            // mock return values
            Participant.query.mockReturnValue({
                findById: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(participant),
            });
            uuidv4.mockReturnValue(dataProductUuid);
            Utils.getBaseUrl.mockReturnValue('https://example.com');
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('terms-and-conditions-hash'),
            });
            const mockInsert = jest.fn().mockResolvedValue({ id: dataProductUuid, participant_id: participant.id, title: inputData.title, description: inputData.description, route: inputData.route });
            const mockWithGraphFetched = jest.fn().mockReturnValue({ id: dataProductUuid, participant_id: participant.id, title: inputData.title, description: inputData.description, route: inputData.route });
            DataProduct.query.mockReturnValue({
                insert: mockInsert.mockReturnThis(),
                withGraphFetched: mockWithGraphFetched,
            });
            GaiaXService.embedDataProductUrls.mockReturnValue({
                id: dataProductUuid,
                participant_id: participant.id,
                title: inputData.title,
                description: inputData.description,
                route: inputData.route,
                urls: ['url1', 'url2']
            });

            // call tested function and assert return value
            await expect(GaiaXDataProductService.store(inputData)).resolves.toEqual({
                id: dataProductUuid,
                participant_id: participant.id,
                title: inputData.title,
                description: inputData.description,
                route: inputData.route,
                urls: ['url1', 'url2']
            });

            // assert correct calls
            expect(Participant.query().findById).toHaveBeenCalledWith(inputData.participantId);
            expect(GaiaXService.issueDataResource).toHaveBeenCalled();
            expect(GaiaXService.issueDataServiceOffering).toHaveBeenCalled();
            expect(GaiaXService.issueDataProductDescription).toHaveBeenCalled();
            expect(GaiaXService.issueDatasetDescription).toHaveBeenCalled();
            expect(GaiaXService.issueDataUsage).toHaveBeenCalled();
            expect(GaiaXService.issueSoftwareResource).toHaveBeenCalled();
            expect(GaiaXService.issueInstantiatedVirtualResource).toHaveBeenCalled();
            expect(GaiaXService.issueServiceAccessPoint).toHaveBeenCalled();
            expect(DataProduct.query().insert).toHaveBeenCalledWith({
                id: dataProductUuid,
                participant_id: participant.id,
                title: inputData.title,
                description: inputData.description,
                route: inputData.route,
            });
            expect(GaiaXService.embedDataProductUrls).toHaveBeenCalledWith(expect.any(Object));
        });

        it('should clean up participant data on error and rethrow the error', async () => {
            const inputData = {
                participantId: 1,
                title: 'Data Product Title',
                description: 'Data Product Description',
                route: '/data-product-route',
                termsAndConditions: 'T&C content',
                license: 'License content',
                termsOfUsage: 'Terms of Usage content',
                policy: 'Policy content',
                dataLanguageCode: 'en',
                dataCreatedAt: new Date(),
                dataExpiresAt: new Date(),
                privateKey: 'private-key'
            };

            const participant = { id: 1, slug: 'participant-slug' };
            const dataProductUuid = 'data-product-uuid';

            // mock return values
            Participant.query.mockReturnValue({
                findById: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(participant),
            });
            uuidv4.mockReturnValue(dataProductUuid);
            GaiaXService.issueDataResource.mockRejectedValue(new Error('Something went wrong'));

            // call tested function
            await expect(GaiaXDataProductService.store(inputData)).rejects.toThrow('Something went wrong');

            // assert correct calls
            expect(Participant.query().findById).toHaveBeenCalledWith(inputData.participantId);
            expect(ParticipantStorage.cleanupParticipant).toHaveBeenCalledWith(`${participant.slug}/${dataProductUuid}`);
        });
    });

    describe('buildDataProductUrl', () => {
        it('should return the correct URL for the data product', () => {
            const route = '/data-product-route';
            // mock Utils.getBaseUrl return value
            Utils.getBaseUrl.mockReturnValue('https://example.com');

            // call tested function
            const result = GaiaXDataProductService.buildDataProductUrl(route);

            // assert return value
            expect(result).toBe('https://example.com/data-product-route');
        });
    });

    describe('storeTermsAndConditions', () => {
        it('should store terms and conditions and return its URL and hash', async () => {
            const participantSlug = 'participant-slug';
            const uuid = 'data-product-uuid';
            const termsAndConditions = 'T&C content';

            // mock return values
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('terms-and-conditions-hash'),
            });
            Utils.getBaseUrl.mockReturnValue('https://example.com');

            // call tested function
            const [url, hash] = await GaiaXDataProductService.storeTermsAndConditions(participantSlug, uuid, termsAndConditions);

            // assert correct call to ParticipantStorage.storeFile
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(
                participantSlug,
                `${uuid}/${GaiaXDataProductService.FILENAME_TERMS_AND_CONDITIONS}`,
                termsAndConditions
            );

            // assert return values
            expect(url).toBe('https://example.com/gaia-x/participant-slug/data-product-uuid/terms-and-conditions');
            expect(hash).toBe('terms-and-conditions-hash');
        });
    });

    describe('storeLicense', () => {
        it('should store the license and return its URL', async () => {
            const participantSlug = 'participant-slug';
            const uuid = 'data-product-uuid';
            const license = 'License content';

            // mock Utils.getBaseUrl return value
            Utils.getBaseUrl.mockReturnValue('https://example.com');

            // call tested function
            const result = await GaiaXDataProductService.storeLicense(participantSlug, uuid, license);

            // assert correct ParticipantStorage.storeFile call
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(
                participantSlug,
                `${uuid}/${GaiaXDataProductService.FILENAME_LICENSE}`,
                license
            );
            // assert return value
            expect(result).toBe('https://example.com/gaia-x/participant-slug/data-product-uuid/terms-and-conditions');
        });
    });

    describe('storeTermsOfUsage', () => {
        it('should store the terms of usage', async () => {
            const participantSlug = 'participant-slug';
            const uuid = 'data-product-uuid';
            const termsOfUsage = 'Terms of Usage content';

            // call tested function
            await GaiaXDataProductService.storeTermsOfUsage(participantSlug, uuid, termsOfUsage);

            // assert correct ParticipantStorage.storeFile call
            expect(ParticipantStorage.storeFile).toHaveBeenCalledWith(
                participantSlug,
                `${uuid}/${GaiaXDataProductService.FILENAME_TERMS_OF_USAGE}`,
                termsOfUsage
            );
        });
    });

    describe('cleanupParticipantData', () => {
        it('should clean up the participant data directory', async () => {
            const participantSlug = 'participant-slug';
            const uuid = 'data-product-uuid';

            // call tested function
            await GaiaXDataProductService.cleanupParticipantData(participantSlug, uuid);

            // assert correct ParticipantStorage.cleanupParticipant call
            expect(ParticipantStorage.cleanupParticipant).toHaveBeenCalledWith(`${participantSlug}/${uuid}`);
        });
    });
});

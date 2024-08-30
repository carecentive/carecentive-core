const Participant = require("../../../models/Participant");
const DidService = require("../../../services/gaiax/DidService");
const GaiaXService = require("../../../services/gaiax/GaiaXService");
const ParticipantStorage = require("../../../source/helpers/gaiax/ParticipantStorage");
const GaiaXParticipantService = require("../../..//services/gaiax/ParticipantService");

// Mocking necessary modules and functions
jest.mock("../../../models/Participant");
jest.mock('../../../source/Errors');
jest.mock("../../../services/gaiax/DidService");
jest.mock("../../../services/gaiax/GaiaXService");
jest.mock("../../../source/helpers/gaiax/ParticipantStorage");

describe('ParticipantService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('store', () => {
        it('should create a Participant and its associated credentials', async () => {
            const inputData = {
                participantSlug: 'participant-slug',
                certificateChain: ['cert1', 'cert2'],
                privateKey: 'private-key',
                vatId: 'VAT123',
                organizationName: 'Org Name',
                countryCode: 'DE'
            };

            // mock return values
            Participant.query.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(undefined),
                insert: jest.fn().mockResolvedValue({ slug: 'participant-slug' })
            });
            GaiaXService.embedParticipantUrls.mockReturnValue({ slug: 'participant-slug', urls: ['url1', 'url2'] });

            // call tested function
            const result = await GaiaXParticipantService.store(inputData);

            // assert correct calls
            expect(DidService.createDid).toHaveBeenCalledWith(inputData.participantSlug, inputData.certificateChain);
            expect(GaiaXService.issueTermsAndConditions).toHaveBeenCalledWith(inputData.participantSlug, inputData.privateKey);
            expect(GaiaXService.issueLegalRegistrationNumber).toHaveBeenCalledWith(inputData.participantSlug, inputData.vatId);
            expect(GaiaXService.issueParticipant).toHaveBeenCalledWith(inputData.participantSlug, inputData.privateKey, inputData.organizationName, inputData.countryCode);
            expect(GaiaXService.issueCompliance).toHaveBeenCalledWith(inputData.participantSlug);
            expect(Participant.query().insert).toHaveBeenCalledWith({ slug: inputData.participantSlug });
            expect(GaiaXService.embedParticipantUrls).toHaveBeenCalledWith({ slug: 'participant-slug' });

            // assert returned value
            expect(result).toEqual({ slug: 'participant-slug', urls: ['url1', 'url2'] });
        });

        it('should clean up participant on error and rethrow the error', async () => {
            const inputData = {
                participantSlug: 'participant-slug',
                certificateChain: ['cert1', 'cert2'],
                privateKey: 'private-key',
                vatId: 'VAT123',
                organizationName: 'Org Name',
                countryCode: 'DE'
            };

            // mock return values
            Participant.query.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                first: jest.fn().mockResolvedValue(undefined),
                insert: jest.fn().mockResolvedValue({ slug: 'participant-slug' })
            });
            GaiaXService.issueLegalRegistrationNumber.mockRejectedValue(new Error('Something went wrong'));

            // call tested function
            await expect(GaiaXParticipantService.store(inputData)).rejects.toThrow('Something went wrong');

            // expect correct function calls
            expect(DidService.createDid).toHaveBeenCalledWith(inputData.participantSlug, inputData.certificateChain);
            expect(GaiaXService.issueTermsAndConditions).toHaveBeenCalledWith(inputData.participantSlug, inputData.privateKey);
            expect(GaiaXService.issueLegalRegistrationNumber).toHaveBeenCalledWith(inputData.participantSlug, inputData.vatId);
            expect(ParticipantStorage.cleanupParticipant).toHaveBeenCalledWith(inputData.participantSlug);
            expect(GaiaXService.issueParticipant).not.toHaveBeenCalled();
            expect(GaiaXService.issueCompliance).not.toHaveBeenCalled();
            expect(Participant.query().insert).not.toHaveBeenCalled();
        });
    });

    describe('cleanupParticipant', () => {
        it('should call ParticipantStorage.cleanupParticipant with the correct slug', async () => {
            const participantSlug = 'participant-slug';

            // call tested function
            await GaiaXParticipantService.cleanupParticipant(participantSlug);

            // assert return value
            expect(ParticipantStorage.cleanupParticipant).toHaveBeenCalledWith(participantSlug);
        });
    });
});

const Participant = require("../../models/Participant");
const Errors = require('../../source/Errors');
const DidService = require("./DidService");
const GaiaXService = require("./GaiaXService");
const ParticipantStorage = require("../../source/helpers/gaiax/ParticipantStorage");

/**
 * Service for creating Participants
 */
class ParticipantService {

    /**
     * Creates a Participant along with its DID and Gaia-X credentials
     * @param inputData
     * @returns {Promise<Participant>}
     */
    static async store(inputData) {
        const participantSlug = inputData["participantSlug"];

        /**
         * @type {Participant | undefined}
         */
        const storedParticipant = await Participant.query().where('slug', participantSlug).first();

        if(storedParticipant) {
            throw new Errors.ConflictError("A Participant with this slug already exists.");
        }

        let participant = undefined;
        try {
            await DidService.createDid(participantSlug, inputData["certificateChain"]);
            await GaiaXService.issueTermsAndConditions(participantSlug, inputData["privateKey"]);
            await GaiaXService.issueLegalRegistrationNumber(participantSlug, inputData["vatId"]);
            await GaiaXService.issueParticipant(participantSlug, inputData["privateKey"], inputData["organizationName"], inputData["countryCode"]);
            await GaiaXService.issueCompliance(participantSlug);
            await GaiaXService.issueDataResource(participantSlug, inputData["privateKey"]);
            await GaiaXService.issueDataServiceOffering(participantSlug, inputData["privateKey"]);

            participant = await Participant.query().insert({
                slug: participantSlug,
            });
        }catch (e) {
            await this.cleanupParticipant(participantSlug);
            throw e;
        }

        return GaiaXService.embedUrls(participant);
    }

    /**
     * Removes Participant's directory
     *
     * @param participantSlug
     * @returns {Promise<void>}
     */
    static async cleanupParticipant(participantSlug) {
        return ParticipantStorage.cleanupParticipant(participantSlug);
    }
}

module.exports = ParticipantService;

const crypto = require("crypto");
const DataProduct = require("../../models/DataProduct");
const Participant = require("../../models/Participant");
const Errors = require('../../source/Errors');
const GaiaXService = require("./GaiaXService");
const ParticipantStorage = require("../../source/helpers/gaiax/ParticipantStorage");
const Utils = require("../../source/Utils");
const { v4: uuidv4 } = require('uuid');

/**
 * Service for creating DataProducts
 */
class DataProductService {

    /**
     * Filenames
     */
    static FILENAME_TERMS_AND_CONDITIONS = 'terms-and-conditions';
    static FILENAME_LICENSE = 'license';
    static FILENAME_TERMS_OF_USAGE = 'terms-of-usage';

    /**
     * Creates a DataProduct and its Gaia-X credentials
     *
     * @param inputData
     * @returns {Promise<DataProduct>}
     */
    static async store(inputData) {
        const participantId = inputData["participantId"];

        /**
         * @type {Participant | undefined}
         */
        const participant = await Participant.query().findById(participantId).first();

        if(! participant) {
            throw new Errors.NotFoundError(`A participant with ID ${participantId} was not found.`);
        }
        const dataProductUuid = uuidv4();
        const participantSlug = participant.slug;
        const url = this.buildDataProductUrl(inputData['route']);


        let dataProduct = null;
        try {
            const [termsAndConditionsUrl, termsAndConditionsHash] = await this.storeTermsAndConditions(
                participantSlug,
                dataProductUuid,
                inputData["termsAndConditions"]
            );
            const licenseUrl = await this.storeLicense(participantSlug, dataProductUuid, inputData['license']);
            await this.storeTermsOfUsage(participantSlug, dataProductUuid, inputData['termsOfUsage']);

            await GaiaXService.issueDataResource(
                participantSlug,
                dataProductUuid,
                inputData['title'],
                inputData['description'],
                url,
                inputData['policy'],
                licenseUrl,
                inputData["privateKey"]
            );
            await GaiaXService.issueDataServiceOffering(
                participantSlug,
                dataProductUuid,
                inputData['title'],
                termsAndConditionsUrl,
                termsAndConditionsHash,
                inputData['policy'],
                inputData["privateKey"]
            );
            await GaiaXService.issueDataProductDescription(
                participantSlug,
                dataProductUuid,
                inputData['title'],
                inputData['description'],
                termsAndConditionsUrl,
                termsAndConditionsHash,
                licenseUrl,
                inputData['policy'],
                inputData['dataExpiresAt'],
                inputData['privateKey'],
            );
            await GaiaXService.issueDatasetDescription(
                participantSlug,
                dataProductUuid,
                inputData['title'],
                url,
                licenseUrl,
                inputData['dataLanguageCode'],
                inputData['dataCreatedAt'],
                inputData['dataExpiresAt'],
                inputData['privateKey'],
            );

            await GaiaXService.issueDataUsage(participantSlug, dataProductUuid, inputData['privateKey']);

            dataProduct = await DataProduct.query()
                .insert({
                    id: dataProductUuid,
                    participant_id: participantId,
                    title: inputData['title'],
                    description: inputData['description'],
                    route: inputData['route'],
                })
                .withGraphFetched('participant');
        }catch (e) {
            await this.cleanupParticipantData(participantSlug, dataProductUuid);
            throw e;
        }

        return GaiaXService.embedDataProductUrls(dataProduct);
    }

    /**
     * Returns URL for the data product
     *
     * @param {string} route
     * @returns {string}
     */
    static buildDataProductUrl(route) {
        return Utils.getBaseUrl() + route;
    }

    /**
     * Store terms and credentials, output its URL and hash
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} termsAndConditions
     *
     * @returns {Promise<(string|string)[]>}
     */
    static async storeTermsAndConditions(participantSlug, uuid, termsAndConditions ) {
        await ParticipantStorage.storeFile(
            participantSlug,
            `${uuid}/${this.FILENAME_TERMS_AND_CONDITIONS}`,
            termsAndConditions
        );

        const url = `${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${uuid}/${this.FILENAME_TERMS_AND_CONDITIONS}`;
        const hash = crypto.createHash("sha256").update(termsAndConditions).digest('hex');
        return [url, hash];
    }

    /**
     * Store license, output its URL
     *
     * @param {string} participantSlug
     * @param {string} uuid
     * @param {string} license
     *
     * @returns {Promise<string>}
     */
    static async storeLicense(participantSlug, uuid, license) {
        await ParticipantStorage.storeFile(
            participantSlug,
            `${uuid}/${this.FILENAME_LICENSE}`,
            license
        );

        return`${Utils.getBaseUrl()}/gaia-x/${participantSlug}/${uuid}/${this.FILENAME_TERMS_AND_CONDITIONS}`;
    }

    /**
     * Creates terms and conditions document
     *
     * @param participantSlug
     * @param uuid
     * @param termsOfUsage
     * @returns {Promise<void>}
     */
    static async storeTermsOfUsage(participantSlug, uuid, termsOfUsage) {
        await ParticipantStorage.storeFile(
            participantSlug,
            `${uuid}/${this.FILENAME_TERMS_OF_USAGE}`,
            termsOfUsage
        );
    }

    /**
     * Removes Participant's data directory
     *
     * @param participantSlug
     * @param uuid - uuid of the data directory
     * @returns {Promise<void>}
     */
    static async cleanupParticipantData(participantSlug, uuid) {
        return ParticipantStorage.cleanupParticipant(`${participantSlug}/${uuid}`);
    }
}

module.exports = DataProductService;

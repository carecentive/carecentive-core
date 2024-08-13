const Joi = require("joi");

class DataContractProposalValidator {

    static async getValidatedData(req) {
        return this.validationRules().validateAsync(req.body, {abortEarly: false});
    }

    static validationRules() {
        return Joi.object({
            participantUrl: Joi.string()
                .uri({allowRelative: false})
                .pattern(/^[^?]+$/)
                .message("Must be a valid URL to your Gaia-X Participant self description")
                .required(),
        });
    }
}

module.exports = DataContractProposalValidator;

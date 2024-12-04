const Joi = require("joi");

class ParticipantValidator {

    static async getValidatedData(req) {
        return this.validationRules().validateAsync(req.body, {abortEarly: false});
    }

    static validationRules() {
        return Joi.object({
            participantSlug: Joi.string()
                .pattern(/^[A-Za-z0-9\-_]+$/)
                .message('Participant slug must consist of only alphanumerical characters, underscores and dashes')
                .required(),
            organizationName: Joi.string()
                .required(),
            countryCode: Joi.string()
                .pattern(/^[A-Z]{2}-[A-Z0-9]{1,3}$/)  // Two uppercase letters, a hyphen, then 1-3 alphanumeric characters
                .message('VAT ID must start with two uppercase letters followed by 8 to 12 digits')
                .required(),
            vatId: Joi.string()
                .pattern(/^[A-Z]{2}[0-9]{8,12}$/)
                .message('ISO 3166-2 code must follow the format "XX-YYY", where XX is the country code and YYY is the subdivision code.')
                .required(),
            privateKey: Joi.string()
                .pattern(/^-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=\n]+)-----END PRIVATE KEY-----\n?$/)
                .message('Private key must be in the PEM format.')
                .required(),
            certificateChain: Joi.array()
                .items(
                    Joi.string()
                    .pattern(/^-----BEGIN CERTIFICATE-----\n([A-Za-z0-9+/=\n]+)-----END CERTIFICATE-----\n?$/)
                    .message('Certificate must be in the PEM format.')
                    .required()
                )
                .min(1)
                .message('The array must contain at least one valid PEM-formatted certificate.')
                .required(),
        });
    }
}

module.exports = ParticipantValidator;

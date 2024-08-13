const Joi = require("joi");

class DataContractForSigningValidator {

    static async getValidatedData(req) {
        return this.validationRules().validateAsync(req.body, {abortEarly: false});
    }

    static validationRules() {
        return Joi.object({
            privateKey: Joi.string()
                .pattern(/^-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=\n]+)-----END PRIVATE KEY-----\n?$/)
                .message('Private key must be in the PEM format.')
                .required(),
        });
    }
}

module.exports = DataContractForSigningValidator;

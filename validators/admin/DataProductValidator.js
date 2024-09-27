const Joi = require("joi");
const DataProduct = require("../../models/DataProduct");

class DataProductValidator {

    /**
     * Definition of routes allowed for sharing via Gaia-X
     *
     * @type {string[]}
     */
    static ALLOWED_ROUTES = ['/api/measurements', '/api/questionnaires'];

    static async getValidatedData(req) {
        return this.validationRules().validateAsync(req.body, {abortEarly: false});
    }

    static validationRules() {
        return Joi.object({
            participantId: Joi.number()
                .integer()
                .min(1)
                .required(),
            title: Joi.string()
                .max(DataProduct.LIMIT_TITLE)
                .required(),
            description: Joi.string()
                .max(DataProduct.LIMIT_DESCRIPTION)
                .required(),
            termsAndConditions: Joi.string()
                .required(),
            termsOfUsage: Joi.string()
                .required(),
            license: Joi.string()
                .required(),
            policy: Joi.string()
                .required(),
            route: Joi.string()
                .max(DataProduct.LIMIT_ROUTE)
                .valid(...this.ALLOWED_ROUTES)
                .required(),
            privateKey: Joi.string()
                .pattern(/^-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=\n]+)-----END PRIVATE KEY-----\n?$/)
                .message('Private key must be in the PEM format.')
                .required(),
            dataCreatedAt: Joi.date().less('now').allow(null),
            dataExpiresAt: Joi.date().greater('now').allow(null),
            dataLanguageCode: Joi.string().min(2).max(2).allow(null),
        });
    }
}

module.exports = DataProductValidator;

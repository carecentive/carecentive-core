const Joi = require("joi");

class RemoteDidValidator {

    static async getValidatedData(payload) {
        return this.validationRules().validateAsync(payload, {abortEarly: false, allowUnknown: true});
    }

    static validationRules() {
        return Joi.object({
            id: Joi.string()
                .pattern(/^did:web:[^\s#]+$/)
                .required(),
            verificationMethod: Joi.array().items(Joi.object({
                id: Joi.string().pattern(/^did:web:[^\s#]+#JWK2020-RSA/).required(),
                type: Joi.string().valid('JsonWebKey2020').required()
            })).length(1),
            publicKeyJwk: Joi.object({
                x5u: Joi.string().uri({allowRelative: false}).required()
            }),
        });
    }
}

module.exports = RemoteDidValidator;

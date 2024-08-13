const Joi = require("joi");

class SignedDataContractValidator {

    static async getValidatedData(req, numberOfSignatures = 1) {
        return this.validationRules(numberOfSignatures)
            .validateAsync(req.body, {abortEarly: false, allowUnknown: true});
    }

    static validationRules(numberOfSignatures = 1) {
        return Joi.object({
            proof: Joi.array().items(Joi.object({
                type: Joi.string().valid("JsonWebSignature2020").required(),
                created: Joi.date().less('now').allow(null),
                proofPurpose: Joi.string().valid("assertionMethod").required(),
                verificationMethod: Joi.string().pattern(/^did:web:[^\s#]+#JWK2020-RSA$/).required(),
                jws: Joi.string().pattern(/^[\w\-]+\.\.[\w\-]+$/).required(),
            })).length(numberOfSignatures),
        });
    }
}

module.exports = SignedDataContractValidator;

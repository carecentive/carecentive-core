const Joi = require("joi");

class RemoteParticipantValidator {

    static async getValidatedData(payload) {
        return this.validationRules().validateAsync(payload, {abortEarly: false, allowUnknown: true});
    }

    static validationRules() {
        return Joi.object({
            type: Joi.alternatives().try(
                Joi.string().valid('VerifiableCredential'),
                Joi.array().items(Joi.string().valid('VerifiableCredential')).length(1)
            ).required(),
            id: Joi.string()
                .uri({allowRelative: false})
                .required(),
            issuer: Joi.string()
                .pattern(/^did:web:[^\s#]+$/)
                .required(),
            issuanceDate: Joi.date().less('now').required(),
            credentialSubject: Joi.object({
                id: Joi.string()
                    .uri({allowRelative: false})
                    .required(),
                type: Joi.string().pattern(/^gx:\w+Participant$/).required(),
                "gx:legalName": Joi.string().required(),
                "gx:legalRegistrationNumber": Joi.object({
                    id: Joi.string().uri().required(),
                }),
                "gx:headquarterAddress": Joi.object({
                    "gx:countrySubdivisionCode": Joi.string().pattern(/^[A-Z]{2}-[A-Z0-9]{1,3}$/).required(),
                }),
                "gx:legalAddress": Joi.object({
                    "gx:countrySubdivisionCode": Joi.string().pattern(/^[A-Z]{2}-[A-Z0-9]{1,3}$/).required(),
                }),
            }),
            proof: Joi.object({
                created: Joi.date().less('now').allow(null),
                type: Joi.string().valid("JsonWebSignature2020").required(),
                proofPurpose: Joi.string().valid("assertionMethod").required(),
                verificationMethod: Joi.string().pattern(/^did:web:[^\s#]+#JWK2020-RSA$/).required(),
                jws: Joi.string().pattern(/^[\w\-]+\.\.[\w\-]+$/).required(),
            }),
        });
    }
}

module.exports = RemoteParticipantValidator;

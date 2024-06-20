const Joi = require("joi");

class ThirdPartyTokenValidator {

    static async getValidatedData(req) {
        return this.validationRules().validateAsync(req.body, {abortEarly: false});
    }

    static validationRules() {
        return Joi.object({
            active: Joi.bool().required(),
            validTill: Joi.date().greater('now').allow(null),
        });
    }
}

module.exports = ThirdPartyTokenValidator;

const Joi = require("joi");
const DataProductValidator = require("./DataProductValidator");

class ThirdPartyTokenValidator {

    static async getValidatedData(req) {
        return this.validationRules().validateAsync(req.body, {abortEarly: false});
    }

    static validationRules() {
        return Joi.object({
            active: Joi.bool().required(),
            validTill: Joi.date().greater('now').allow(null),
            route: Joi.string().valid(...DataProductValidator.ALLOWED_ROUTES).allow(null),
        });
    }
}

module.exports = ThirdPartyTokenValidator;

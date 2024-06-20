const ThirdPartyToken = require("../models/ThirdPartyToken");
const crypto = require('crypto');

class ThirdPartyTokenService {
    /**
     * Creates a new API access token for third parties and stores it
     *
     * @param inputData input data
     * @returns {Objection.QueryBuilder<ThirdPartyToken, ThirdPartyToken>}
     */
    static async store(inputData) {
        return ThirdPartyToken.query().insert({
            active: inputData["active"],
            valid_till: inputData["validTill"],
            access_token: this.generateRandomString(80)
        });
    }

    /**
     * Generates a random string with characters from 0 to 9 and a to f
     *
     * @param length length of the string
     * @returns {string}
     */
    static generateRandomString(length) {
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
    }
}

module.exports = ThirdPartyTokenService

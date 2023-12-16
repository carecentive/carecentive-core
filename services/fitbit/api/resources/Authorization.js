const ApiRequest = require("../ApiRequest");

class Authorization {
    static async authorizeUser(authorizationCode) {
        return ApiRequest.authorizeUser(authorizationCode);
    }
}

module.exports = Authorization;
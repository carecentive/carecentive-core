const ApiRequest = require("../ApiRequest");

class RefreshToken {
    static async refreshToken(currentRefreshToken) {
        return ApiRequest.refreshToken(currentRefreshToken);
    }
}

module.exports = RefreshToken;
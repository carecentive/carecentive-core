const ApiRequest = require("../ApiRequest");

/**
 * Utility class for handling authorization-related operations.
 */
class Authorization {
    /**
     * Authorizes a user using the provided authorization code and ApiRequest class.
     * @param {*} authorizationCode - The authorization code obtained during the OAuth authorization process.
     * @returns {Promise<Object>} A Promise resolving to the response containing access token and related information.
     */
    static async authorizeUser(authorizationCode) {
        return ApiRequest.authorizeUser(authorizationCode);
    }

    /**
     * Refreshes an access token using the provided refresh token and ApiRequest class.
     * @param {*} currentRefreshToken - The current refresh token associated with the access token.
     * @returns {Promise<Object>} A Promise resolving to the response containing the refreshed access token and related information.
     */
    static async refreshToken(currentRefreshToken) {
        return ApiRequest.refreshToken(currentRefreshToken);
    }
}

module.exports = Authorization;
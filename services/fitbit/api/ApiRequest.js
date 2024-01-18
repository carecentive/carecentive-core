const config = require("../Config");
const CONSTANTS = require("../Constants");
const { AuthenticationMissingError, FitbitApiError } = require("../../../source/Errors");
const axios = require("axios");
const Logger = require("../../../source/Loggers");
const RateLimit = require("./RateLimit");

class ApiRequest {
    static async authorizeUser(authorizationCode) {
        try {
            // Define the API endpoint and request payload
            const oauthUrl = config.apiUrl + config.oauth2TokenEndpoint;

            const data = new URLSearchParams();
            data.append(CONSTANTS.CLIENT_ID, process.env.FITBIT_CLIENT_ID);
            data.append(CONSTANTS.CODE, authorizationCode);
            data.append(CONSTANTS.CODE_VERIFIER, process.env.FITBIT_CODE_VERIFIER);
            data.append(CONSTANTS.GRANT_TYPE, config.grantTypeAuthorizationCode);

            // Define request headers
            const headers = {
                [CONSTANTS.AUTHORIZATION]: CONSTANTS.TOKEN_TYPE_BASIC + CONSTANTS.SINGLE_SPACE + process.env.FITBIT_BASIC_TOKEN,
                [CONSTANTS.CONTENT_TYPE]: config.contentType,
            };

            const response = await axios({
                method: CONSTANTS.METHOD_TYPE_POST,
                url: oauthUrl,
                data: data,
                headers: headers
            });

            if (response.status == CONSTANTS.HTTP_STATUS.OK) {
                return response.data;
            } else {
                throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
            }
        } catch (error) {
            Logger.error("Error while authorizing user!");
            throw new Error(error);
        }
    }

    static async refreshToken(currentRefreshToken) {
        try {
            // Define the API endpoint and request payload
            const oauthUrl = config.apiUrl + config.oauth2TokenEndpoint;

            const data = new URLSearchParams();
            data.append(CONSTANTS.GRANT_TYPE, config.grantTypeRefreshToken);
            data.append(CONSTANTS.REFRESH_TOKEN, currentRefreshToken);

            // Define request headers
            const headers = {
                [CONSTANTS.AUTHORIZATION]: CONSTANTS.TOKEN_TYPE_BASIC + CONSTANTS.SINGLE_SPACE + process.env.FITBIT_BASIC_TOKEN,
                [CONSTANTS.CONTENT_TYPE]: config.contentType,
            };

            const response = await axios({
                method: "post",
                url: oauthUrl,
                data: data,
                headers: headers
            });

            if (response.status == CONSTANTS.HTTP_STATUS.OK) {
                return response;
            } else {
                throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
            }
        } catch (error) {
            Logger.error("Error while retrieving the refresh token!");
            throw new Error(error);
        }
    }

    static async sendRequest(accessToken, endpointUrl) {
        if (!accessToken) {
            throw new AuthenticationMissingError("Fitbit Bearer token not set.");
        }

        if (!endpointUrl) {
            throw new Error("API endpoint URL must be specified.");
        }

        try {
            const headers = {
                [CONSTANTS.AUTHORIZATION]: CONSTANTS.TOKEN_TYPE_BEARER + CONSTANTS.SINGLE_SPACE + accessToken
            };

            const response = await axios({
                method: CONSTANTS.METHOD_TYPE_GET,
                url: endpointUrl,
                headers: headers
            });

            if (response.status == CONSTANTS.HTTP_STATUS.OK) {
                let totalQuota = response.headers["fitbit-rate-limit-limit"];
                let refillSeconds = response.headers['fitbit-rate-limit-reset'];
                RateLimit.set(totalQuota, refillSeconds, 10);
                return response;
            } else {
                throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
            }
        } catch (error) {
            if(error.response && error.response.status == CONSTANTS.HTTP_STATUS.TOO_MANY_REQUEST) {
                let refill = 3600;
                
                if(RateLimit.remainingSecondsUntilRefill) {
                    refill = RateLimit.remainingSecondsUntilRefill;
                }

                Logger.error("You have reached the rate limit. Please wait until it is being refilled (approximately " 
                + refill + " Seconds) and try again.");
            }
            Logger.error("Error while sending API request!");
            throw new Error(error);
        }
    }
}

module.exports = ApiRequest;
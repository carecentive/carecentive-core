const config = require("../Config");
const CONSTANTS = require("../Constants");
const { AuthenticationMissingError, FitbitApiError } = require("../../../source/Errors");
const axios = require("axios");
const Logger = require("../../../source/Loggers");
const RateLimit = require("./RateLimit");

/**
 * This class is used to forward the actual api requests and send back the responses.
 */
class ApiRequest {
    /**
     * Authorizes a user using the provided authorization code.
     * This method sends a request to the Fitbit OAuth2 token endpoint to exchange the authorization code
     * for an access token and refresh token.
     * @param {*} authorizationCode - The authorization code obtained during the OAuth authorization process.
     * @returns {Promise<Object>} A Promise resolving to the response containing the access token and related information.
     * @throws {FitbitApiError} If the response status is not OK or if there are errors in the response data.
     * @throws {Error} If there are issues with sending the authorization request or handling the response.
     */
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

    /**
     * Refreshes an access token using the provided refresh token.
     * This method sends a request to the Fitbit OAuth2 token endpoint with the current refresh token to obtain a new access token.
     * @param {*} currentRefreshToken - The current refresh token associated with the access token.
     * @returns {Promise<AxiosResponse>} A Promise resolving to the Axios response containing the refreshed access token and related information.
     * @throws {FitbitApiError} If the HTTP response status indicates an error, it throws a FitbitApiError with details.
     * @throws {Error} If there are issues with sending the request or processing the response.
     */
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

    /**
     * Sends a HTTP request to the specified endpoint URL with the provided access token.
     * Throws errors if the access token is missing, or if there are issues with the endpoint URL or the HTTP request.
     * Sets rate limit information if available in the response headers.
     * @param {*} accessToken - The access token used for authentication.
     * @param {*} endpointUrl - The URL of the API endpoint to send the request to.
     * @returns {Promise<AxiosResponse>} A Promise resolving to the AxiosResponse object containing the response data.
     * @throws {AuthenticationMissingError} If the access token is missing.
     * @throws {Error} If there are issues with the endpoint URL or the HTTP request.
     * @throws {FitbitApiError} If the Fitbit API returns an error response.
     */
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
                // let refillSeconds = response.headers['fitbit-rate-limit-reset'];
                // Remaining seconds retrieved from the response does not work as expected.
                // It throws rate limit error even after adding padding of 600 seconds to the remaining seconds.
                // Therefore, a fixed number of seconds is used which is 3600.
                let refillSeconds = 3600;
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
const { FitbitApiError } = require("../source/Errors");
const axios = require("axios");
const { HTTP_STATUS, FITBIT: CONSTANTS } = require("../source/Constants");
const { fitbit: config } = require("../source/Config");
const logger = require("winston");

class FitbitApi {
	static async apiSetup(authorizationCode) {
		try {
			// Define the API endpoint and request payload
			const oauthUrl = config.apiUrl + config.oauth2TokenEndpoint;

			const data = new URLSearchParams();
			data.append(CONSTANTS.CLIENT_ID, config.clientId);
			data.append(CONSTANTS.CODE, authorizationCode);
			data.append(CONSTANTS.CODE_VERIFIER, config.codeVerifier);
			data.append(CONSTANTS.GRANT_TYPE, config.grantTypeAuthorizationCode);

			// Define request headers
			const headers = {
				[CONSTANTS.AUTHORIZATION]: config.authorizationHeader,
				[CONSTANTS.CONTENT_TYPE]: config.contentType,
			};

			const response = await axios({
				method: "post",
				url: oauthUrl,
				data: data,
				headers: headers
			});

			if (response.status == HTTP_STATUS.OK) {
				return response.data;
			} else {
				throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
			}
		} catch(error) {
			logger.error(error);
			throw error;
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
				[CONSTANTS.AUTHORIZATION]: config.authorizationHeader,
				[CONSTANTS.CONTENT_TYPE]: config.contentType,
			};
	
			const response = await axios({
				method: "post",
				url: oauthUrl,
				data: data,
				headers: headers
			});
	
			if (response.status == HTTP_STATUS.OK) {
				return response.data;
			} else {
				throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
			}	
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}
}

module.exports = FitbitApi;
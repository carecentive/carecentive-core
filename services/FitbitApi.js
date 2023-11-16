const { FitbitApiError, AuthenticationMissingError } = require("../source/Errors");
const axios = require("axios");
const { HTTP_STATUS, FITBIT: CONSTANTS } = require("../source/Constants");
const { fitbit: config } = require("../source/Config");
const logger = require("../source/Loggers");

class FitbitApi {
	static async apiSetup(authorizationCode) {
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
			// Error class is used to get the line number. In other words, it is easy to debug where the error is. 
			const err = new Error(error);
			logger.error(err);
			throw err;
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
	
			if (response.status == HTTP_STATUS.OK) {
				return response.data;
			} else {
				throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
			}	
		} catch (error) {
			// Error class is used to get the line number. In other words, it is easy to debug where the error is.
			const err = new Error(error);
			logger.error(err);
			throw err;
		}
	}

	static async apiRequest(accessToken, endpointUrl) {
		if(!accessToken) {
			throw new AuthenticationMissingError("Fitbit Bearer token not set.");
		}

		if(!endpointUrl) {
			throw new Error("API endpoint URL must be specified.");
		}

		try {			
			const headers = {
				[CONSTANTS.AUTHORIZATION]: CONSTANTS.TOKEN_TYPE_BEARER + CONSTANTS.SINGLE_SPACE + accessToken
			};

			const response = await axios({
				method: "get",
				url: endpointUrl,
				headers: headers
			});
	
			if (response.status == HTTP_STATUS.OK) {
				return response.data;
			} else {
				throw new FitbitApiError(response.status + " (" + response.data.errors + ")");
			}
		} catch (error) {
			// Error class is used to get the line number. In other words, it is easy to debug where the error is. 
			const err = new Error(error);
			logger.error(err);
			throw err;
		}
	}
}

module.exports = FitbitApi;
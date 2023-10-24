const FitbitApi = require("./FitbitApi");
const FitbitToken = require("../models/FitbitToken");
const { getDatetimeString } = require("../source/Utils");
const { UserTokenNotFoundError } = require("../source/Errors");

var logger = require("winston");

class FitbitDataHub {
	static async registerUser(authorizationCode, userId) {
		try {
			const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, scope, user_id: fitbitUserId } = await FitbitApi.apiSetup(authorizationCode);

			let user = await this.getUser(userId);

			if (user) {
				await user.$query().patch({
					fitbit_user_id: fitbitUserId,
					token_last_updated: this.getCurrentDateTime(),
					access_token: accessToken,
					expiration_date: this.getExpirationDateTime(expiresIn),
					refresh_token: refreshToken,
					scope: scope
				});
			} else {
				await FitbitToken.query()
					.insert({
						user_id: userId,
						fitbit_user_id: fitbitUserId,
						token_last_updated: this.getCurrentDateTime(),
						access_token: accessToken,
						expiration_date: this.getExpirationDateTime(expiresIn),
						refresh_token: refreshToken,
						scope: scope
					});
			}
		} catch(error) {
			logger.error(error);
			throw error;
		}
	}

	static async refreshUserToken(userId) {
		try {
			let user = await this.getUser(userId);

			if(user) {
				// Get the refresh token through the Fitbit API Wrapper
				const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, user_id: fitbitUserId } = await FitbitApi.refreshToken(user.refresh_token);

				// Insert updated user data into database
				await user.$query().patchAndFetch({
					fitbit_user_id: fitbitUserId,
					token_last_updated: this.getCurrentDateTime(),
					access_token: accessToken,
					expiration_date: this.getCurrentDateTime(expiresIn),
					refresh_token: refreshToken
				});

				return user;
			} else {
				throw new UserTokenNotFoundError;
			}
		} catch(error) {
			logger.error(error);
			throw error;
		}
	}

	static async dataPollBatchUser(userId) {
		try {
			let tokenData = await this.refreshUserToken(userId);
			console.log("Token Data:", tokenData);
		}
		catch (error) {
			logger.error("Could not refresh access token for user " + userId + ": ", error, JSON.stringify(error));
			return;
		}
	}

	static async getUser(userId) {
		return await FitbitToken.query().findOne({ user_id: userId });
	}

	static getCurrentDateTime() {
		return getDatetimeString(new Date());
	}

	static getExpirationDateTime(expiresIn) {
		let date = new Date();
		date.setUTCSeconds(date.getUTCSeconds() + expiresIn);
		return getDatetimeString(date);
	}
}

module.exports = FitbitDataHub;
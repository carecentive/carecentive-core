const DateTimeUtils = require("./DateTimeUtils");
const { UserTokenNotFoundError } = require("../../source/Errors");
const Logger = require("../../source/Loggers");
const ApiManager = require("./api/ApiManager");
const DBManager = require("./db/DBManager");
const FitbitHelper = require("./FitbitHelper");
const Config = require("./Config");

class FitbitManager {
	static async registerUser(authorizationCode, userId) {
		try {
			const { access_token: accessToken,
				expires_in: expiresIn,
				refresh_token: refreshToken,
				scope, user_id: fitbitUserId
			} = await ApiManager.authorizeUser(authorizationCode);

			let user = await DBManager.getUser(userId);
			let tokenLastUpdated = DateTimeUtils.getCurrentDateTime();
			let expirationDate = DateTimeUtils.getExpirationDateTime(expiresIn);

			if (user) {
				DBManager.updateUser(user, fitbitUserId, tokenLastUpdated,
					accessToken, expirationDate, refreshToken, scope);
			} else {
				// Membership creation date in the fitbit account. This date is fetched once during the creation of the database entry.
				let memberSince = await FitbitHelper.getMemberSince(accessToken, fitbitUserId);

				DBManager.insertUser(userId, fitbitUserId, memberSince, tokenLastUpdated,
					accessToken, expirationDate, refreshToken, scope);
			}
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static async refreshUserToken(userId) {
		try {
			let user = await DBManager.getUser(userId);

			if (user) {
				// Get the refresh token through the Fitbit API Wrapper
				const { access_token: accessToken,
					expires_in: expiresIn,
					refresh_token: refreshToken,
					user_id: fitbitUserId
				} = await ApiManager.refreshToken(user.refresh_token);
				let tokenLastUpdated = DateTimeUtils.getCurrentDateTime();
				let expirationDate = DateTimeUtils.getCurrentDateTime(expiresIn);

				// Insert updated user data into database
				DBManager.updateAndFetchUser(user, fitbitUserId, tokenLastUpdated, accessToken,
					expirationDate, refreshToken);

				return user;
			} else {
				throw new UserTokenNotFoundError;
			}
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static async pollAllUsersData() {
		let users = await DBManager.getAllUsers();

		for (const user of users) {
			await this.pollUserData(user.user_id);
		}
	}

	static async pollUserData(userId) {
		let tokenData;
		try {
			tokenData = await this.refreshUserToken(userId);
		}
		catch (error) {
			Logger.error("Could not refresh access token for user " + userId + ": ", error, JSON.stringify(error));
			return;
		}

		try {
			await this.getHeartRate(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing heart rate data for user " + userId + ":", error, JSON.stringify(error));
		}
	}

	static async getHeartRate(userId, accessToken, fitbitUserId) {
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, Config.requestType.heart);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateTimeRanges(startTimestamp, endTimestamp);

		for (const range of ranges) {
			let response = await ApiManager.getHeartRateIntradayByDateAndTime(accessToken, fitbitUserId, range);
			await DBManager.storeTimeSeriesData(userId, Config.requestType.heart, range, response);
		}
	}
}
module.exports = FitbitManager;
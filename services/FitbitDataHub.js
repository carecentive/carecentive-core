const FitbitApi = require("./FitbitApi");
const FitbitToken = require("../models/FitbitToken");
const FitbitData = require("../models/FitbitData");
const { getDatetimeString, dateToTimestamp, getFormatedDateFromTimestamp, getDateRanges, getNowAsTimestamp, getTimestampFromISOTimestamp, isTimestampToday } = require("../source/Utils");
const { UserTokenNotFoundError } = require("../source/Errors");
const {fitbit: config} = require("../source/Config");
var logger = require("../source/Loggers");

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
				// Membership creation date in the fitbit account. This date is fetched once during the creation of the database entry.
				let memberSince = await this.getMemberSince(accessToken, fitbitUserId);

				await FitbitToken.query()
					.insert({
						user_id: userId,
						fitbit_user_id: fitbitUserId,
						fitbit_member_since: memberSince,
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

	static async dataPollBatch() {
		let users = await this.getAllUsers();

		for(const user of users) {
			await this.dataPollBatchUser(user.user_id);
		}
	}

	static async dataPollBatchUser(userId) {
		let tokenData;
		try {
			tokenData = await this.refreshUserToken(userId);
		}
		catch (error) {
			logger.error("Could not refresh access token for user " + userId + ": ", error, JSON.stringify(error));
			return;
		}

		// Retrieve Heart Rate Time Series
		try {
			await this.getHeartRateData(userId, tokenData);
		} catch (error) {
			logger.error("Error in get heart rate data for user ID " + userId + " : ", error, JSON.stringify(error));
		}
	}

	// Start Date: Retrieve the date last polled date
	// Check if there is any last polled entry
	// If not, use the membership since date
	// Maximum range: 1 year, divide the years and use multiple request for loop
	// if last polled date is today, then fetch the second last polled date and delete the last polled data.

	static async getHeartRateData(userId, token) {
		let latestPolledTimestamp = await this.getLastPolledTimestamp(userId, config.request_type.heart);

		if(isTimestampToday(latestPolledTimestamp)) {
			let lastTimestampToBeDeleted = new Date(latestPolledTimestamp * 1000);
			latestPolledTimestamp = await this.getSecondLastPolledTimestamp(userId, config.request_type.heart);
			await this.deleteLastPolledData(userId, lastTimestampToBeDeleted, config.request_type.heart);
		}
		
		let startDate = getFormatedDateFromTimestamp(latestPolledTimestamp, "YYYY-MM-DD");
		let endDate = getFormatedDateFromTimestamp(getNowAsTimestamp(), "YYYY-MM-DD");		
		let dateRanges = getDateRanges(startDate, endDate, 30);
		let request_time = new Date();

		for(const range of dateRanges) {
			let response = await this.getHeartRateDataForEachInterval(token, range);
			await this.storeHeartRateResponse(userId, response, request_time);
		}
	}

	static async getHeartRateDataForEachInterval(token, range) {
		let endpoint = config.apiUrl
		+ "/1/user/" + token.fitbit_user_id 
		+ "/activities/"+ config.request_type.heart +"/date/"
		+ range.start + "/" + range.end + ".json";

		return await FitbitApi.apiRequest(token.access_token, endpoint);
	}

	// Store the data in database
	static async storeHeartRateResponse(userId, response, request_time) {
		try {
			await FitbitData.query().insert({
				user_id: userId,
				request_type: config.request_type.heart,
				request_timestamp: request_time,
				response: JSON.stringify(response) 
			});	
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	static async deleteLastPolledData(userId, requestTimestamp, requestType) {
		try {
			await FitbitData.query().delete().where({
				"user_id": userId,
				"request_type": requestType,
				"request_timestamp": requestTimestamp
			});	
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	static async getLastPolledTimestamp(userId, requestType) {
		let lastPolledTimestamp = await FitbitData.query().where({
			"user_id": userId,
			"request_type": requestType
		})
			.orderBy("request_timestamp", "DESC")
			.first();

		if(!lastPolledTimestamp) {
			return await this.getFitbitMembershipCreationTimestamp(userId);
		}

		return getTimestampFromISOTimestamp(lastPolledTimestamp.request_timestamp);
	}

	static async getSecondLastPolledTimestamp(userId, requestType) {
		let secondLastPolledTimestamp = await FitbitData.query().where({
			"user_id": userId,
			"request_type": requestType
		})
			.distinct("request_timestamp")
			.orderBy("request_timestamp", "DESC")
			.limit(1)
			.offset(1)
			.first(1);

		if(!secondLastPolledTimestamp) {
			return await this.getFitbitMembershipCreationTimestamp(userId);
		}

		return getTimestampFromISOTimestamp(secondLastPolledTimestamp.request_timestamp);
	}

	static async getFitbitMembershipCreationTimestamp(userId) {
		let date =  await this.getFitbitMembershipCreationDate(userId);
		return dateToTimestamp(date);
	}

	static async getFitbitMembershipCreationDate(userId) {
		let user = await this.getUser(userId);
		return user.fitbit_member_since;
	}

	static async getAllUsers() {
		return await FitbitToken.query().distinct("user_id");
	}

	static async getUser(userId) {
		return await FitbitToken.query().findOne({ user_id: userId });
	}

	/**
	 * Get the membership creation date of the user from the fitbit account's user profile.
	 * Current date will be returned if the access to the data is restricted or not found.
	 * 
	 * @param {*} accessToken  A token to access fitbit data.
	 * @param {*} fitbitUserId The user id of the fitbit user in the fitbit account. 
	 * @returns A date
	 * 
	 */
	static async getMemberSince(accessToken, fitbitUserId) {
		try {
			let response = await this.getProfile(accessToken, fitbitUserId);
			let memberSince = response.user.memberSince;
			if(memberSince) {
				return memberSince;
			} else {
				return this.getCurrentDateTime();
			}
		} catch(error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Get the profile information of the user from the fitbit account.
	 * 
	 * @param {*} accessToken  A token to access fitbit data.
	 * @param {*} fitbitUserId The user id of the fitbit user in the fitbit account. 
	 * @returns 
	 */
	static async getProfile(accessToken, fitbitUserId) {
		try {
			let endpoint = config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/"+ "profile.json";

			return await FitbitApi.apiRequest(accessToken, endpoint);
		} catch(error) {
			logger.error(error);
			throw error;
		}
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
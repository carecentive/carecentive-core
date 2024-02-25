const Logger = require("../../source/Loggers");
const ApiManager = require("./api/ApiManager");
const DBManager = require("./db/DBManager");
const DateTimeUtils = require("./DateTimeUtils");
const Config = require("./Config");
const Scope = require("./Scope");

/**
 * Utility class providing helper methods for interacting with Fitbit data.
 * Includes methods for retrieving membership creation date, last polled timestamp,
 * last synced timestamp, and generating time ranges.
 */
class FitbitHelper {
	static lastSyncedTimestamp = 0;

	/**
	 * Get the membership creation date of the user from the fitbit account's user profile.
	 * Current date will be returned if the access to the data is restricted or not found.
	 * @param {*} accessToken  A token to access fitbit data.
	 * @param {*} fitbitUserId The user id of the fitbit user in the fitbit account. 
	 * @returns A formated date
	 */
	static async getMemberSince(accessToken, fitbitUserId) {
		try {
			let response = await ApiManager.getSummary(accessToken, fitbitUserId, Config.resource.profile.requestType);
			let memberSince = response.user.memberSince;
			if (memberSince) {
				return memberSince;
			} else {
				return DateTimeUtils.getCurrentDateTime();
			}
		} catch (error) {
			Logger.error("Error while processing membership date");
			throw error;
		}
	}

	/**
	 * Get last polled timestamp from the database.
	 * If the reqested type is not available yet in database, it will fetch fitbit membership creation timestamp.
	 * @param {*} userId The user id of carecentive app..
	 * @param {*} requestType The type of the request such as heart, sleep, profile, etc. 
	 * @returns A timestamp
	 */
	static async getLastPolledTimestamp(userId, requestType) {
		try {
			let lastPolledEntry = await DBManager.getLastPolledEntry(userId, requestType);
			if (!lastPolledEntry) {
				return await this.getFitbitMembershipCreationTimestamp(userId);
			}
			return DateTimeUtils.getTimestampFromISOTimestamp(lastPolledEntry.to_timestamp);
		} catch (error) {
			Logger.error("Error while processing last polled date for user " + userId);
			throw error;
		}

	}

	static async getFitbitMembershipCreationTimestamp(userId) {
		let date = await this.getFitbitMembershipCreationDate(userId);
		return DateTimeUtils.dateToTimestamp(date);
	}

	static async getFitbitMembershipCreationDate(userId) {
		let user = await DBManager.getUser(userId);
		return user.fitbit_member_since;
	}

	/**
	 * Get last synced timestamp from the api.
	 * Particularly, It will retrieve all the devices used by the fitbit user and
	 * get the latest synced device with its timestamp.
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @returns A timestamp
	 */
	static async getLastSyncedTimestamp(userId, accessToken, fitbitUserId) {
		let status = await Scope.isGranted(userId, Config.resource.devices);
		if(status && this.lastSyncedTimestamp <= 0) {
			let devices = await ApiManager.getSummary(accessToken, fitbitUserId, Config.resource.devices.requestType);
			let timestamp = 0;
			for (const device of devices) {
				let currentTimestamp = DateTimeUtils.getTimestampFromISOTimestamp(device.lastSyncTime);
				if (currentTimestamp >= timestamp) {
					timestamp = currentTimestamp;
				}
			}
	
			this.lastSyncedTimestamp = timestamp;	
		}

		return this.lastSyncedTimestamp;
	}

	static getTimeRanges(startTimestamp, endTimestamp) {
		return DateTimeUtils.getTimeRanges(startTimestamp, endTimestamp);
	}

	static getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange) {
		return DateTimeUtils.getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange);
	}
}

module.exports = FitbitHelper;
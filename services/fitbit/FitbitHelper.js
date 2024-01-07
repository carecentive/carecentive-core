const Logger = require("../../source/Loggers");
const ApiManager = require("./api/ApiManager");
const DBManager = require("./db/DBManager");
const DateTimeUtils = require("./DateTimeUtils");

class FitbitHelper {
	static lastSyncedTimestamp = 0;

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
			let response = await ApiManager.getProfile(accessToken, fitbitUserId);
			let memberSince = response.user.memberSince;
			if (memberSince) {
				return memberSince;
			} else {
				return DateTimeUtils.getCurrentDateTime();
			}
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static async getLastPolledTimestamp(userId, requestType) {
		try {
			let lastPolledEntry = await DBManager.getLastPolledEntry(userId, requestType);
			if (!lastPolledEntry) {
				return await this.getFitbitMembershipCreationTimestamp(userId);
			}
			return DateTimeUtils.getTimestampFromISOTimestamp(lastPolledEntry.to_timestamp);
		} catch (error) {
			Logger.error(error);
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

	static async getLastSyncedTimestamp(accessToken, fitbitUserId) {
		if(this.lastSyncedTimestamp <= 0) {
			let devices = await ApiManager.getDevices(accessToken, fitbitUserId);
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
		try {
			return DateTimeUtils.getTimeRanges(startTimestamp, endTimestamp);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange) {
		try {
			return DateTimeUtils.getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}
}

module.exports = FitbitHelper;
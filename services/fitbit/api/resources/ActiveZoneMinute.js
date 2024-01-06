const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class ActiveZoneMinute {
	static async getActiveZoneMinuteIntradayByDateAndTime(accessToken, fitbitUserId, date, startTime, endTime) {
		try {
			// /1/user/[user-id]/activities/active-zone-minutes/date/[date]/1d/[detail-level]/time/[start-time]/[end-time].json
			let endpoint = Config.apiUrl
				+ "/1/user/" + fitbitUserId
				+ "/activities/active-zone-minutes/date/"
				+ date + "/1d/1min/time/"
				+ startTime + "/" + endTime + ".json";

			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}
}

module.exports = ActiveZoneMinute;
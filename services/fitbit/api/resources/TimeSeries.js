const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class TimeSeries {
	static async getTimeSeriesByDateRange(accessToken, fitbitUserId, resource, startDate, endDate) {
		// /1/user/[user-id]/foods/log/[resource]/date/[start-date]/[end-date].json
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + resource + "/date/"
			+ startDate + "/" + endDate + ".json";

		return await ApiRequest.sendRequest(accessToken, endpoint);
	}
}

module.exports = TimeSeries;
const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Intraday {
	static async getIntradayByDateAndTime(accessToken, fitbitUserId, requestType, date, startTime, endTime, detailLevel) {
		// /1/user/[user-id]/activities/[resource]/date/[date]/1d/[detail-level]/time/[start-time]/[end-time].json
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/date/"
			+ date + "/1d/" + detailLevel + "/time/"
			+ startTime + "/" + endTime + ".json";
		
		return await ApiRequest.sendRequest(accessToken, endpoint);
	}

    static async getIntradayByInterval(accessToken, fitbitUserId, requestType, startDate, endDate) {
		// /1/user/[user-id]/br/date/[start-date]/[end-date]/all.json
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/date/"
			+ startDate + "/" + endDate
			+ "/all.json";
			
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Intraday;
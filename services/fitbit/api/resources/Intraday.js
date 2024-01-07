const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Intraday {
	static async getIntradayByDateAndTime(accessToken, fitbitUserId, resource, date, startTime, endTime, detailLevel) {
		try {
			// /1/user/[user-id]/activities/[resource]/date/[date]/1d/[detail-level]/time/[start-time]/[end-time].json
			let endpoint = Config.apiUrl
				+ "/1/user/" + fitbitUserId
				+ "/activities/" + resource + "/date/"
				+ date + "/1d/" + detailLevel + "/time/"
				+ startTime + "/" + endTime + ".json";
            
			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

    static async getIntradayByInterval(accessToken, fitbitUserId, resource, startDate, endDate) {
        try {
			// /1/user/[user-id]/br/date/[start-date]/[end-date]/all.json
			let endpoint = Config.apiUrl
				+ "/1/user/" + fitbitUserId
				+ "/" + resource + "/date/"
				+ startDate + "/" + endDate
                + "/all.json";
				
			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
    }
}

module.exports = Intraday;
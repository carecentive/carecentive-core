const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Summary {
    static async getSummary(accessToken, fitbitUserId, requestType) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + ".json";

		return await ApiRequest.sendRequest(accessToken, endpoint);
    }

	static async getSummaryByDate(accessToken, fitbitUserId, requestType, date) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/"
			+ date + ".json";
			
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }

	static async getFriends(accessToken, fitbitUserId, requestType) {
		let endpoint = Config.apiUrl
			+ "/1.1/user/" + fitbitUserId
			+ "/" + requestType + ".json";
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Summary;
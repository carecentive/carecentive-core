const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Summary {
    static async getSummary(accessToken, fitbitUserId, resource) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + resource + ".json";

		return await ApiRequest.sendRequest(accessToken, endpoint);
    }

	static async getSummaryByDate(accessToken, fitbitUserId, resource, date) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + resource + "/"
			+ date + ".json";
			
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Summary;
const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Summary {
    static async getSummary(accessToken, fitbitUserId, resource) {
        try {
			let endpoint = Config.apiUrl
				+ "/1/user/" + fitbitUserId
				+ "/" + resource + ".json";

			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
    }

	static async getSummaryByDate(accessToken, fitbitUserId, resource, date) {
        try {
			let endpoint = Config.apiUrl
				+ "/1/user/" + fitbitUserId
				+ "/" + resource + "/"
				+ date + ".json";
				
			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
    }
}

module.exports = Summary;
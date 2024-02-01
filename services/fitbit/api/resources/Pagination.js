const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Pagination {
    static async getData(accessToken, fitbitUserId, requestType, afterDate, limit) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + ".json"
            + "?afterDate=" + afterDate 
            + "&sort=asc&limit=" + limit + "&offset=0";

		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Pagination;
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Pagination {
    static async getData(accessToken, fitbitUserId, resource, afterDate, limit) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + resource + ".json"
            + "?afterDate=" + afterDate 
            + "&sort=asc&limit=" + limit + "&offset=0";

		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Pagination;
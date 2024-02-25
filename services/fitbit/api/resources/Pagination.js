const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

/** 
 * Utility class to Generate endpoints, forward requests to ApiRequest and send back the responses to the previous layer for paginated data.
 */
class Pagination {
  /** 
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses
   * to the previous layer with the paginated data.
	 * Enpoint format: https://api.fitbit.com/1/user/[user-id]/[resource].json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
   * @param {*} afterDate The start date in the format yyyy-MM-ddTHH:mm:ss.
   * @param {*} limit The number of entries to be returned in a single request.
   * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	 */
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
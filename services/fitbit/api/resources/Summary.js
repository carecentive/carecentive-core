const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

/**
 * Utility class to Generate endpoints, forward requests to ApiRequest and send back the responses to the previous layer for summary data.
 */
class Summary {
	/**
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses
	 * to the previous layer with the summary data.
	 * Enpoint format: https://api.fitbit.com/1/user/[fitbitUserId]/[requestType].json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
	 * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	*/
    static async getSummary(accessToken, fitbitUserId, requestType) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + ".json";

		return await ApiRequest.sendRequest(accessToken, endpoint);
    }

	/**
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses 
	 * to the previous layer with the summary data by date.
	 * Enpoint format: https://api.fitbit.com/1/user/[fitbitUserId]/[requestType]/[date].json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
	 * @param {*} date The date of the record to be fetched: YYYY-MM-DD.
	 * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	 */
	static async getSummaryByDate(accessToken, fitbitUserId, requestType, date) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/"
			+ date + ".json";
			
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }

	/**
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses 
	 * to the previous layer with the summary data of the user's friends.
	 * Endpoint Format: https://api.fitbit.com/1/user/[fitbitUserId]/[requestType].json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
	 * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	 */
	static async getFriends(accessToken, fitbitUserId, requestType) {
		let endpoint = Config.apiUrl
			+ "/1.1/user/" + fitbitUserId
			+ "/" + requestType + ".json";
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Summary;
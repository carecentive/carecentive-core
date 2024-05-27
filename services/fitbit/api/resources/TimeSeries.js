const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

/**
 * Utility class to Generate endpoints, forward requests to ApiRequest and send back the responses to the previous layer for timeseries data.
 */
class TimeSeries {
	/**
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses
	 * to the previous layer with the timeseries data within a date range.
	 * Enpoint format: https://api.fitbit.com/1/user/[fitbitUserId]/[requestType]/date/[startDate]/[endDate].json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
	 * @param {*} startDate The start date: YYYY-MM-DD.
	 * @param {*} endDate The end date: YYYY-MM-DD.
	 * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	 */
	static async getTimeSeriesByDateRange(accessToken, fitbitUserId, requestType, startDate, endDate) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/date/"
			+ startDate + "/" + endDate + ".json";

		return await ApiRequest.sendRequest(accessToken, endpoint);
	}
}

module.exports = TimeSeries;
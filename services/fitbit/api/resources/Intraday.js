const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

/**
 * Utility class to Generate endpoints, forward requests to ApiRequest class and send back the responses to the previous layer for intraday data.
 */
class Intraday {
	/**
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses 
	 * to the previous layer with the intraday data for a specific date with a time range.
	 * Enpoint format: https://api.fitbit.com/1/user/[fitbitUserId]/[requestType]/date/[date]/1d/[detailLevel]/time/[startTime]/[endTime].json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
	 * @param {*} date The date in the format YYYY-MM-dd.
	 * @param {*} startTime The start of the time period in the format HH:mm:ss.
	 * @param {*} endTime The end of the time period in the format HH:mm:ss.
	 * @param {*} detailLevel Number of data points to include such as 1min, 5min or, 15min.
	 * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	 */
	static async getIntradayByDateAndTime(accessToken, fitbitUserId, requestType, date, startTime, endTime, detailLevel) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/date/"
			+ date + "/1d/" + detailLevel + "/time/"
			+ startTime + "/" + endTime + ".json";
		
		return await ApiRequest.sendRequest(accessToken, endpoint);
	}

	/**
	 * Generates an endpoint, forwards a request using ApiRequest class and send back the responses 
	 * to the previous layer with the intraday data within a date range.
	 * Enpoint format: https://api.fitbit.com/1/user/[fitbitUserId]/[requestType]/date/[date]/[startDate]/[endDate]/all.json
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} requestType The type of the request.
	 * @param {*} startDate The start date in the format YYYY-MM-DD.
	 * @param {*} endDate The end date in the format YYYY-MM-DD.
	 * @returns {Promise<Object>} A Promise resolving to the response returned by the ApiRequest class.
	 * 
	 */
    static async getIntradayByInterval(accessToken, fitbitUserId, requestType, startDate, endDate) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + requestType + "/date/"
			+ startDate + "/" + endDate
			+ "/all.json";
			
		return await ApiRequest.sendRequest(accessToken, endpoint);
    }
}

module.exports = Intraday;
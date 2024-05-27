const Authorization = require("./resources/Authorization");
const Intraday = require("./resources/Intraday");
const TimeSeries = require("./resources/TimeSeries");
const Summary = require("./resources/Summary");
const Pagination = require("./resources/Pagination");
const Config = require("../Config");

/**
 * Represents a core class for API calls.
 * It utilize the resources to further process the request and 
 * send back the responses to the previous layer.
 */
class ApiManager {
	static async authorizeUser(authorizationCode) {
		return Authorization.authorizeUser(authorizationCode);
	}

	static async refreshToken(currentRefreshToken) {
		let response = await Authorization.refreshToken(currentRefreshToken);
		return response.data;
	}

	static async getIntradayByDateAndTime(accessToken, fitbitUserId, requestType, range, detailLevel) {
		let response = await Intraday.getIntradayByDateAndTime(accessToken, fitbitUserId, requestType, range.date, range.startTime, range.endTime, detailLevel)
		return response.data;
	}

	static async getIntradayByInterval(accessToken, fitbitUserId, requestType, range) {
		let response = await Intraday.getIntradayByInterval(accessToken, fitbitUserId, requestType, range.startDate, range.endDate)
		return response.data;
	}

	static async getTimeSeriesByDateRange(accessToken, fitbitUserId, requestType, range) {
		let response = await TimeSeries.getTimeSeriesByDateRange(accessToken, fitbitUserId, requestType, range.startDate, range.endDate)
		return response.data;
	}

	/**
	 * Retrieves summary data from the Fitbit API.
	 * If the request type is for fetching friends' data, it calls the Summary.getFriends method,
	 * otherwise, it calls the Summary.getSummary method.
	 * 
	 * @param {*} accessToken - The access token used for authentication.
	 * @param {*} fitbitUserId - The Fitbit user ID for which to retrieve the summary data.
	 * @param {*} requestType - The type of request for retrieving the summary data.
	 * @returns {Promise<Object>} A Promise resolving to the summary data obtained from the Fitbit API.
	 */
	static async getSummary(accessToken, fitbitUserId, requestType) {
		let response;
		if (requestType == Config.resource.friends.requestType) {
			response = await Summary.getFriends(accessToken, fitbitUserId, requestType);
		} else {
			response = await Summary.getSummary(accessToken, fitbitUserId, requestType);
		}
		return response.data;
	}

	static async getSummaryByDate(accessToken, fitbitUserId, requestType, date) {
		let response = await Summary.getSummaryByDate(accessToken, fitbitUserId, requestType, date);
		return response.data;
	}

	static async getPaginatedData(accessToken, fitbitUserId, requestType, afterDate, limit) {
		let response = await Pagination.getData(accessToken, fitbitUserId, requestType, afterDate, limit);
		return response.data;
	}
}

module.exports = ApiManager;
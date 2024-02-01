const Authorization = require("./resources/Authorization");
const RefreshToken = require("./resources/RefreshToken");
const Intraday = require("./resources/Intraday");
const TimeSeries = require("./resources/TimeSeries");
const Summary = require("./resources/Summary");
const Pagination = require("./resources/Pagination");
const Config = require("../Config");

class ApiManager {
	static async authorizeUser(authorizationCode) {
		return Authorization.authorizeUser(authorizationCode);
	}

	static async refreshToken(currentRefreshToken) {
		let response = await RefreshToken.refreshToken(currentRefreshToken);
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
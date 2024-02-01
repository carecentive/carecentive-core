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

	static async getIntradayByDateAndTime(accessToken, fitbitUserId, resource, range, detailLevel) {
		let response = await Intraday.getIntradayByDateAndTime(accessToken, fitbitUserId, resource, range.date, range.startTime, range.endTime, detailLevel)
		return response.data;
	}

	static async getIntradayByInterval(accessToken, fitbitUserId, resource, range) {
		let response = await Intraday.getIntradayByInterval(accessToken, fitbitUserId, resource, range.startDate, range.endDate)
		return response.data;
	}

	static async getTimeSeriesByDateRange(accessToken, fitbitUserId, resource, range) {
		let response = await TimeSeries.getTimeSeriesByDateRange(accessToken, fitbitUserId, resource, range.startDate, range.endDate)
		return response.data;
	}

	static async getSummary(accessToken, fitbitUserId, resource) {
		let response;
		if (resource == Config.resource.friends) {
			response = await Summary.getFriends(accessToken, fitbitUserId, resource);
		} else {
			response = await Summary.getSummary(accessToken, fitbitUserId, resource);
		}
		return response.data;
	}

	static async getSummaryByDate(accessToken, fitbitUserId, resource, date) {
		let response = await Summary.getSummaryByDate(accessToken, fitbitUserId, resource, date);
		return response.data;
	}

	static async getPaginatedData(accessToken, fitbitUserId, resource, afterDate, limit) {
		let response = await Pagination.getData(accessToken, fitbitUserId, resource, afterDate, limit);
		return response.data;
	}
}

module.exports = ApiManager;
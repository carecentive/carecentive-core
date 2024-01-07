const Authorization = require("./resources/Authorization");
const RefreshToken = require("./resources/RefreshToken");
const Profile = require("./resources/Profile");
const Device = require("./resources/Devices");
const Intraday = require("./resources/Intraday");

class ApiManager {
	static async authorizeUser(authorizationCode) {
		return Authorization.authorizeUser(authorizationCode);
	}

	static async refreshToken(currentRefreshToken) {
		let response = await RefreshToken.refreshToken(currentRefreshToken);
		return response.data;
	}

	static async getProfile(accessToken, fitbitUserId) {
		return Profile.getProfile(accessToken, fitbitUserId);
	}

	static async getDevices(accessToken, fitbitUserId) {
		let response = await Device.getDevices(accessToken, fitbitUserId);
		return response.data;
	}

	static async getIntradayByDateAndTime(accessToken, fitbitUserId, resource, range, detailLevel) {
		let response = await Intraday.getIntradayByDateAndTime(accessToken, fitbitUserId, resource, range.date, range.startTime, range.endTime, detailLevel)
		return response.data;
	}
}

module.exports = ApiManager;
const Authorization = require("./resources/Authorization");
const RefreshToken = require("./resources/RefreshToken");
const Profile = require("./resources/Profile");
const Device = require("./resources/Devices");
const HeartRate = require("./resources/HeartRate");

class ApiManager {
	static async authorizeUser(authorizationCode) {
		return Authorization.authorizeUser(authorizationCode);
	}

	static async refreshToken(currentRefreshToken) {
		return RefreshToken.refreshToken(currentRefreshToken);
	}

	static async getProfile(accessToken, fitbitUserId) {
		return Profile.getProfile(accessToken, fitbitUserId);
	}

	static async getDevices(accessToken, fitbitUserId) {
		let response = await Device.getDevices(accessToken, fitbitUserId);
		return response.data;
	}

	static async getHeartRateIntradayByDateAndTime(accessToken, fitbitUserId, range) {
		let response = await HeartRate.getHeartRateIntradayByDateAndTime(accessToken, fitbitUserId, range.date, range.startTime, range.endTime);
		return response.data;
	}
}

module.exports = ApiManager;
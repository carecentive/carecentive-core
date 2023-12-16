const Authorization = require("./resources/Authorization");
const RefreshToken = require("./resources/RefreshToken");
const Profile = require("./resources/Profile");
const Device = require("./resources/Devices");

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
		return Device.getDevices(accessToken, fitbitUserId);
	}
}

module.exports = ApiManager;
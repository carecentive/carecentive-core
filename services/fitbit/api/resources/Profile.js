const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Profile {
	/**
	 * Get the profile information of the user from the fitbit account.
	 * 
	 * @param {*} accessToken  A token to access fitbit data.
	 * @param {*} fitbitUserId The user id of the fitbit user in the fitbit account. 
	 * @returns 
	 */
	static async getProfile(accessToken, fitbitUserId) {
		try {
			let endpoint = Config.apiUrl
				+ "/1/user/" + fitbitUserId
				+ "/" + "profile.json";

			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}
}

module.exports = Profile
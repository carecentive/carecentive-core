const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Devices {
	static async getDevices(accessToken, fitbitUserId) {
		try {
			let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/"+ "devices.json";

			return await ApiRequest.sendRequest(accessToken, endpoint);
		} catch(error) {
			Logger.error(error);
			throw error;
		}
	}
}

module.exports = Devices;
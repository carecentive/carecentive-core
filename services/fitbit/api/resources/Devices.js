const Logger = require("../../../../source/Loggers");
const ApiRequest = require("../ApiRequest");
const Config = require("../../Config");

class Devices {
	static async getDevices(accessToken, fitbitUserId) {
		let endpoint = Config.apiUrl
			+ "/1/user/" + fitbitUserId
			+ "/" + "devices.json";

		return await ApiRequest.sendRequest(accessToken, endpoint);
	}
}

module.exports = Devices;
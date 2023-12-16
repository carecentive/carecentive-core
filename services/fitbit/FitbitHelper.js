const logger = require("../../source/Loggers");
const ApiManager = require("./api/ApiManager");
const DateTimeUtils = require("./DateTimeUtils");

class FitbitHelper {
    /**
	 * Get the membership creation date of the user from the fitbit account's user profile.
	 * Current date will be returned if the access to the data is restricted or not found.
	 * 
	 * @param {*} accessToken  A token to access fitbit data.
	 * @param {*} fitbitUserId The user id of the fitbit user in the fitbit account. 
	 * @returns A date
	 * 
	 */
	static async getMemberSince(accessToken, fitbitUserId) {
		try {
			let response = await ApiManager.getProfile(accessToken, fitbitUserId);
			let memberSince = response.user.memberSince;
			if(memberSince) {
				return memberSince;
			} else {
				return DateTimeUtils.getCurrentDateTime();
			}
		} catch(error) {
			logger.error(error);
			throw error;
		}
	}
}

module.exports = FitbitHelper;
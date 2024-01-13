const ApiManager = require("./api/ApiManager");
const DBManager = require("./db/DBManager");
const FitbitHelper = require("./FitbitHelper");
const RateLimit = require("./api/RateLimit");
const DateTimeUtils = require("./DateTimeUtils");
const { UserTokenNotFoundError } = require("../../source/Errors");

class RequestProcessor {
	static async processRegistration(authorizationCode, userId) {
		const { access_token: accessToken,
			expires_in: expiresIn,
			refresh_token: refreshToken,
			scope, user_id: fitbitUserId
		} = await ApiManager.authorizeUser(authorizationCode);

		let user = await DBManager.getUser(userId);
		let tokenLastUpdated = DateTimeUtils.getCurrentDateTime();
		let expirationDate = DateTimeUtils.getExpirationDateTime(expiresIn);

		if (user) {
			DBManager.updateUser(user, fitbitUserId, tokenLastUpdated,
				accessToken, expirationDate, refreshToken, scope);
		} else {
			// Membership creation date in the fitbit account. This date is fetched once during the creation of the database entry.
			let memberSince = await FitbitHelper.getMemberSince(accessToken, fitbitUserId);

			DBManager.insertUser(userId, fitbitUserId, memberSince, tokenLastUpdated,
				accessToken, expirationDate, refreshToken, scope);
		}
	}

	static async processRefreshToken(userId) {
		let user = await DBManager.getUser(userId);

		if (user) {
			// Get the refresh token through the Fitbit API Wrapper
			const { access_token: accessToken,
				expires_in: expiresIn,
				refresh_token: refreshToken,
				user_id: fitbitUserId
			} = await ApiManager.refreshToken(user.refresh_token);
			let tokenLastUpdated = DateTimeUtils.getCurrentDateTime();
			let expirationDate = DateTimeUtils.getCurrentDateTime(expiresIn);

			// Insert updated user data into database
			DBManager.updateAndFetchUser(user, fitbitUserId, tokenLastUpdated, accessToken,
				expirationDate, refreshToken);

			return user;
		} else {
			throw new UserTokenNotFoundError;
		}
	}

    static async processSingleRequest(userId, accessToken, fitbitUserId, requestType) {
		console.log("Processing "+ requestType);
		console.log("Number of request remainig in processing "+ requestType + " : 1");
		if(RateLimit.isLimitExceeded()) {
			console.log("Request limit is exceeded!");
			RateLimit.setProcessedStatus(userId, false);
			return;
		}

		let response = await ApiManager.getSummary(accessToken, fitbitUserId, requestType);
		await DBManager.storeSummaryData(userId, requestType, response);

		RateLimit.requestProcessed();
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	static async processRequestByDate(userId, accessToken, fitbitUserId, requestType) {
		console.log("Processing "+ requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getTimeRanges(startTimestamp, endTimestamp);

		console.log("RateLimit: "+RateLimit.totalQuota)
		console.log("Refill: "+RateLimit.remainingSecondsUntilRefill)
		console.log("Number of request remainig in processing "+ requestType + " : " + ranges.length);
		for (const range of ranges) {
			if(RateLimit.isLimitExceeded()) {
				console.log("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getSummaryByDate(accessToken, fitbitUserId, requestType, range.date);
			await DBManager.storeSummaryData(userId, requestType, range, response);

			RateLimit.requestProcessed();
		}
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	static async processIntraday(userId, accessToken, fitbitUserId, requestType, detailLevel) {
		console.log("Processing "+ requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getTimeRanges(startTimestamp, endTimestamp);

		console.log("RateLimit: "+RateLimit.totalQuota)
		console.log("Refill: "+RateLimit.remainingSecondsUntilRefill)
		console.log("Number of request remainig in processing "+ requestType + " : " + ranges.length);
		for (const range of ranges) {
			if(RateLimit.isLimitExceeded()) {
				console.log("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getIntradayByDateAndTime(accessToken, fitbitUserId, requestType, range, detailLevel);
			await DBManager.storeIntradayData(userId, requestType, range, response);

			RateLimit.requestProcessed();
		}
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	static async processIntradayByInterval(userId, accessToken, fitbitUserId, requestType, maximumRange) {
		console.log("Processing "+ requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange);

		console.log("RateLimit: "+RateLimit.totalQuota)
		console.log("Refill: "+RateLimit.remainingSecondsUntilRefill)
		console.log("Number of request remainig in processing "+ requestType + " : " + ranges.length);
		for (const range of ranges) {
			if(RateLimit.isLimitExceeded()) {
				console.log("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getIntradayByInterval(accessToken, fitbitUserId, requestType, range);
			await DBManager.storeIntradayByIntervalData(userId, requestType, range, response);

			RateLimit.requestProcessed();
		}
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	static async processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, requestType, maximumRange) {
		console.log("Processing "+ requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange);

		console.log("RateLimit: "+RateLimit.totalQuota)
		console.log("Refill: "+RateLimit.remainingSecondsUntilRefill)
		console.log("Number of request remainig in processing "+ requestType + " : " + ranges.length);
		for (const range of ranges) {
			if(RateLimit.isLimitExceeded()) {
				console.log("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getTimeSeriesByDateRange(accessToken, fitbitUserId, requestType, range);
			await DBManager.storeTimeSeriesByDateRange(userId, requestType, range, response);

			RateLimit.requestProcessed();
		}
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}
}

module.exports = RequestProcessor;
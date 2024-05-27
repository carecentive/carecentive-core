const ApiManager = require("./api/ApiManager");
const DBManager = require("./db/DBManager");
const FitbitHelper = require("./FitbitHelper");
const RateLimit = require("./api/RateLimit");
const DateTimeUtils = require("./DateTimeUtils");
const { UserTokenNotFoundError } = require("../../source/Errors");
const Logger = require("../../source/Loggers");
const Config = require("./Config");
const Scope = require("./Scope");

/**
 * The responsibility of this class is to process the requests in a more moduler way
 */
class RequestProcessor {
	/**
	 * Process user registration by sending request to Fitbit web api and
	 * storing response such as access token, refresh token, scope, expiration time, etc to the database. 
	 * @param {*} authorizationCode A code retrived from the fitbit api to authorize user.
	 * @param {*} userId The user id of carecentive app.
	 * 
	 */
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
			await DBManager.updateUser(user, fitbitUserId, tokenLastUpdated,
				accessToken, expirationDate, refreshToken, scope);
		} else {
			// Membership creation date in the fitbit account. This date is fetched once during the creation of the database entry.
			let memberSince = await FitbitHelper.getMemberSince(accessToken, fitbitUserId);

			await DBManager.insertUser(userId, fitbitUserId, memberSince, tokenLastUpdated,
				accessToken, expirationDate, refreshToken, scope);
		}
	}

	/**
	 * Update user's token in database using the old refresh token.  
	 * @param {*} userId The user id of carecentive app.
	 */
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
			let expirationDate = DateTimeUtils.getExpirationDateTime(expiresIn);

			// Insert updated user data into database
			await DBManager.updateAndFetchUser(user, fitbitUserId, tokenLastUpdated, accessToken,
				expirationDate, refreshToken);

			return user;
		} else {
			throw new UserTokenNotFoundError;
		}
	}

	/**
	 * Send a single request to Fitbit web api and store the response to the database.
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} resource The resource object to generate endpoint.
	 */
	static async processSingleRequest(userId, accessToken, fitbitUserId, resource) {
		if (RateLimit.isLimitExceeded()) return;
		let status = await Scope.isGranted(userId, resource);
		if(!status) return;

		Logger.debug("Processing " + resource.requestType);
		Logger.debug("Number of request remainig in processing " + resource.requestType + " : 1");
		if (RateLimit.isLimitExceeded()) {
			Logger.debug("Request limit is exceeded!");
			RateLimit.setProcessedStatus(userId, false);
			return;
		}

		let response = await ApiManager.getSummary(accessToken, fitbitUserId, resource.requestType);
		await DBManager.storeSummaryData(userId, resource.requestType, response);

		RateLimit.requestProcessed();
		Logger.debug("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	/**
	 * Process multiple requests by date and store the responses to the database.
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} resource The resource object to generate endpoint.
	 */
	static async processRequestByDate(userId, accessToken, fitbitUserId, resource) {
		if (RateLimit.isLimitExceeded()) return;
		let status = await Scope.isGranted(userId, resource);
		if(!status) return;

		Logger.debug("Processing " + resource.requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, resource.requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(userId, accessToken, fitbitUserId);
		const ranges = FitbitHelper.getTimeRanges(startTimestamp, endTimestamp);

		Logger.debug("Number of request remainig in processing " + resource.requestType + " : " + ranges.length);
		for (const range of ranges) {
			if (RateLimit.isLimitExceeded()) {
				Logger.debug("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getSummaryByDate(accessToken, fitbitUserId, resource.requestType, range.date);
			await DBManager.storeSummaryDataByDate(userId, resource.requestType, range, response);

			RateLimit.requestProcessed();
		}
		Logger.debug("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	/**
	 * Process intraday data and store the responses to the database.
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} resource The resource object to generate endpoint.
	 * @param {*} detailLevel The detail information such as 1sec, 1min, etc to generate endpoint.
	 */
	static async processIntraday(userId, accessToken, fitbitUserId, resource, detailLevel) {
		if (RateLimit.isLimitExceeded()) return;
		let status = await Scope.isGranted(userId, resource);
		if(!status) return;

		Logger.debug("Processing " + resource.requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, resource.requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(userId, accessToken, fitbitUserId);
		const ranges = FitbitHelper.getTimeRanges(startTimestamp, endTimestamp);

		Logger.debug("RateLimit: " + RateLimit.totalQuota)
		Logger.debug("Number of request remainig in processing " + resource.requestType + " : " + ranges.length);
		for (const range of ranges) {
			if (RateLimit.isLimitExceeded()) {
				Logger.debug("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getIntradayByDateAndTime(accessToken, fitbitUserId, resource.requestType, range, detailLevel);
			await DBManager.storeIntradayData(userId, resource.requestType, range, response);

			RateLimit.requestProcessed();
		}
		Logger.debug("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	/**
	 * Process intraday data within a date range and store the responses to the database.
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} resource The resource object to generate endpoint.
	 * @param {*} maximumRange The period in between start and end date such as 30 days, 365 days, etc to generate endpoint.
	 */
	static async processIntradayByInterval(userId, accessToken, fitbitUserId, resource, maximumRange) {
		if (RateLimit.isLimitExceeded()) return;
		let status = await Scope.isGranted(userId, resource);
		if(!status) return;

		Logger.debug("Processing " + resource.requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, resource.requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(userId, accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange);

		Logger.debug("RateLimit: " + RateLimit.totalQuota)
		Logger.debug("Number of request remainig in processing " + resource.requestType + " : " + ranges.length);
		for (const range of ranges) {
			if (RateLimit.isLimitExceeded()) {
				Logger.debug("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getIntradayByInterval(accessToken, fitbitUserId, resource.requestType, range);
			await DBManager.storeIntradayByIntervalData(userId, resource.requestType, range, response);

			RateLimit.requestProcessed();
		}
		Logger.debug("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	/**
	 * Process time series data (not intraday) within a date range and store the responses to the database.  
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} resource The resource object to generate endpoint.
	 * @param {*} maximumRange The period in between start and end date such as 30 days, 365 days, etc to generate endpoint.
	 */
	static async processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, resource, maximumRange) {
		if (RateLimit.isLimitExceeded()) return;
		let status = await Scope.isGranted(userId, resource);
		if(!status) return;

		Logger.debug("Processing " + resource.requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, resource.requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(userId, accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateAndTimeRanges(startTimestamp, endTimestamp, maximumRange);

		Logger.debug("RateLimit: " + RateLimit.totalQuota)
		Logger.debug("Number of request remainig in processing " + resource.requestType + " : " + ranges.length);
		for (const range of ranges) {
			if (RateLimit.isLimitExceeded()) {
				Logger.debug("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getTimeSeriesByDateRange(accessToken, fitbitUserId, resource.requestType, range);
			await DBManager.storeTimeSeriesByDateRange(userId, resource.requestType, range, response);

			RateLimit.requestProcessed();
		}
		Logger.debug("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	/**
	 * Process paginated data such as electrocardiogram and store the responses to the database.  
	 * @param {*} userId The user id of carecentive app.
	 * @param {*} accessToken The token to access the fitbit web api.
	 * @param {*} fitbitUserId The fitbit user id of the user.
	 * @param {*} resource The resource object to generate endpoint.
	 * @param {*} limit The number of pages to be considered in single request.
	 */
	static async processPagination(userId, accessToken, fitbitUserId, resource, limit) {
		if (RateLimit.isLimitExceeded()) return;
		let status = await Scope.isGranted(userId, resource);
		if(!status) return;

		Logger.debug("Processing " + resource.requestType);
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, resource.requestType);
		let startDate = DateTimeUtils.getFormatedDateFromTimestamp(startTimestamp, "YYYY-MM-DDTHH:mm:ss");
		let response;

		Logger.debug("RateLimit: " + RateLimit.totalQuota);
		do {
			if (RateLimit.isLimitExceeded()) {
				Logger.debug("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			
			response = await ApiManager.getPaginatedData(accessToken, fitbitUserId, resource.requestType, startDate, limit);
			if(resource.requestType == Config.resource.electrocardiogram.requestType){
				if(response.ecgReadings.length > 0) {
					let endDate = response.ecgReadings[response.ecgReadings.length-1].startTime;
					await DBManager.storePaginatedData(userId, resource.requestType, startDate, endDate, response.ecgReadings);
					startDate = endDate;
				}
			}

			RateLimit.requestProcessed();
		} while(response.pagination.next);

		Logger.debug("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}
}

module.exports = RequestProcessor;
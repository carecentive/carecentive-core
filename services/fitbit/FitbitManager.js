const DateTimeUtils = require("./DateTimeUtils");
const { UserTokenNotFoundError } = require("../../source/Errors");
const Logger = require("../../source/Loggers");
const ApiManager = require("./api/ApiManager");
const DBManager = require("./db/DBManager");
const FitbitHelper = require("./FitbitHelper");
const Config = require("./Config");
const Scheduler = require("./Scheduler");
const RateLimit = require("./api/RateLimit");

class FitbitManager {
	static async registerUser(authorizationCode, userId) {
		try {
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
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static async refreshUserToken(userId) {
		try {
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
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static async pollAllUsersDataWithScheduler() {
		await this.pollAllUsersData();

		if(RateLimit.isAllDataProcessed()) {
			process.exit();
		}

		if(RateLimit.isAlreadySet) {
			let cronExpression = "*/"+ RateLimit.remainingSecondsUntilRefill +" * * * * *";
			
			console.log("Invoking Scheduler: The scheduler will execute in every " 
			+ RateLimit.remainingSecondsUntilRefill + " seconds until all data is being processed!"
			+ "In each execution, ("+ RateLimit.totalQuota + " - 10%) requests per user will be processed!");
	
			Scheduler.init(cronExpression, this.pollAllUsersData.bind(this));
			Scheduler.start();
		}
	}

	static async pollAllUsersData() {
		let users = await DBManager.getAllUsers();

		console.log("Total number of users: " + users.length);

		RateLimit.initProcessedUsers(users);

		for (const user of users) {
			console.log("Processing user with user id: " + user.user_id);
			await this.pollUserData(user.user_id);
		}

		if(RateLimit.isAllDataProcessed()) {
			console.log("All users processed sucessfully!");
			if(Scheduler.task) {
				Scheduler.stop();
				process.exit();
			}
		}
	}

	static async pollUserData(userId) {
		let tokenData;
		try {
			tokenData = await this.refreshUserToken(userId);
			// console.log(tokenData)
		}
		catch (error) {
			Logger.error("Could not refresh access token for user " + userId + ": ", error, JSON.stringify(error));
			return;
		}

		try {
			await this.processActivitiesData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing Activities data for user " + userId + ":", error, JSON.stringify(error));
		}

		// try {
		// 	await this.processTimeSeriesData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		// } catch (error) {
		// 	Logger.error("Error while processing Time Series data for user " + userId + ":", error, JSON.stringify(error));
		// }
		
		// try {
		// 	await this.processIntradayData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		// } catch (error) {
		// 	Logger.error("Error while processing Intraday data for user " + userId + ":", error, JSON.stringify(error));
		// }

		console.log(RateLimit.processedUsers)
		console.log("Resetting the number of request processed to 0!");
		RateLimit.resetRequestProcessed();
	}

	static async processActivitiesData(userId, accessToken, fitbitUserId) {
		try {
			await this.processSingleCall(userId, accessToken, fitbitUserId, Config.requestType.activityStatistics);
			await this.processSingleCall(userId, accessToken, fitbitUserId, Config.requestType.activityGoals);
			// The endpoint for Activity Log List is correct but the request failed with status code 400.
			// Here is the url for the endpoint: https://dev.fitbit.com/build/reference/web-api/activity/get-activity-log-list/
			await this.processSingleCall(userId, accessToken, fitbitUserId, Config.requestType.activityLogList);
			await this.processSingleCall(userId, accessToken, fitbitUserId, Config.requestType.favoriteActivities);
			await this.processSingleCall(userId, accessToken, fitbitUserId, Config.requestType.frequentActivities);
			await this.processSingleCall(userId, accessToken, fitbitUserId, Config.requestType.recentActivities);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of activities for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await this.processRequestByDate(userId, accessToken, fitbitUserId, Config.requestType.dailyActivitySummary);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of activities by date for user " + userId + ":", error, JSON.stringify(error));
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

	static async processTimeSeriesData(userId, accessToken, fitbitUserId) {
		try {
			await this.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.foodLogsCalories, 1095);
			await this.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.foodLogsWater, 1095);
		} catch (error) {
			Logger.error("Error while processing food log data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await this.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.bodyBmi, 1095);
			await this.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.bodyFat, 1095);
			await this.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.bodyWeight, 1095);
		} catch (error) {
			Logger.error("Error while processing body bmi, fat and weight data for user " + userId + ":", error, JSON.stringify(error));
		}
	}

	static async processIntradayData(userId, accessToken, fitbitUserId) {
		try {
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.heart, Config.detailLevel.oneSecond);
		} catch (error) {
			Logger.error("Error while processing heart rate data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.activeZoneMinutes, Config.detailLevel.oneMinute);
		} catch (error) {
			Logger.error("Error while processing active zone minutes data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.calories, Config.detailLevel.oneMinute);
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.distance, Config.detailLevel.oneMinute);
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.elevation, Config.detailLevel.oneMinute);
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.floors, Config.detailLevel.oneMinute);
			await this.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.steps, Config.detailLevel.oneMinute);
		} catch (error) {
			Logger.error("Error while processing activities data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await this.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.requestType.breathingRate, 30);
			await this.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.requestType.heartRateVariability, 30);
			await this.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.requestType.spO2, 30);
		} catch (error) {
			Logger.error("Error while processing intraday data by interval for user " + userId + ":", error, JSON.stringify(error));
		}
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
module.exports = FitbitManager;
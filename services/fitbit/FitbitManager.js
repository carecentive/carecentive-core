const Logger = require("../../source/Loggers");
const DBManager = require("./db/DBManager");
const Config = require("./Config");
const Scheduler = require("./Scheduler");
const RateLimit = require("./api/RateLimit");
const RequestProcessor = require("./RequestProcessor");

class FitbitManager {
	static async registerUser(authorizationCode, userId) {
		try {
			await RequestProcessor.processRegistration(authorizationCode, userId);
		} catch (error) {
			Logger.error(error);
			throw error;
		}
	}

	static async getUpdatedRefreshToken(userId) {
		try {
			let user = await RequestProcessor.processRefreshToken(userId)
			return user;
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
			tokenData = await this.getUpdatedRefreshToken(userId);
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

		try {
			await this.processTimeSeriesData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing Time Series data for user " + userId + ":", error, JSON.stringify(error));
		}
		
		try {
			await this.processIntradayData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing Intraday data for user " + userId + ":", error, JSON.stringify(error));
		}

		console.log(RateLimit.processedUsers)
		console.log("Resetting the number of request processed to 0!");
		RateLimit.resetRequestProcessed();
	}

	static async processActivitiesData(userId, accessToken, fitbitUserId) {
		try {
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.requestType.activityStatistics);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.requestType.activityGoals);
			// The endpoint for Activity Log List is correct but the request failed with status code 400.
			// Here is the url for the endpoint: https://dev.fitbit.com/build/reference/web-api/activity/get-activity-log-list/
			// await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.requestType.activityLogList);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.requestType.favoriteActivities);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.requestType.frequentActivities);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.requestType.recentActivities);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of activities for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.requestType.dailyActivitySummary);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of activities by date for user " + userId + ":", error, JSON.stringify(error));
		}
	}

	static async processTimeSeriesData(userId, accessToken, fitbitUserId) {
		try {
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.foodLogsCalories, 1095);
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.foodLogsWater, 1095);
		} catch (error) {
			Logger.error("Error while processing food log data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.bodyBmi, 1095);
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.bodyFat, 1095);
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.requestType.bodyWeight, 1095);
		} catch (error) {
			Logger.error("Error while processing body bmi, fat and weight data for user " + userId + ":", error, JSON.stringify(error));
		}
	}

	static async processIntradayData(userId, accessToken, fitbitUserId) {
		try {
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.heart, Config.detailLevel.oneSecond);
		} catch (error) {
			Logger.error("Error while processing heart rate data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.activeZoneMinutes, Config.detailLevel.oneMinute);
		} catch (error) {
			Logger.error("Error while processing active zone minutes data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.calories, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.distance, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.elevation, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.floors, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.requestType.steps, Config.detailLevel.oneMinute);
		} catch (error) {
			Logger.error("Error while processing activities data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await RequestProcessor.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.requestType.breathingRate, 30);
			await RequestProcessor.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.requestType.heartRateVariability, 30);
			await RequestProcessor.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.requestType.spO2, 30);
		} catch (error) {
			Logger.error("Error while processing intraday data by interval for user " + userId + ":", error, JSON.stringify(error));
		}
	}
}
module.exports = FitbitManager;
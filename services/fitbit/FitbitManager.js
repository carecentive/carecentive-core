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
			Logger.error("Could not register user with user ID " + userId + ": ", error, JSON.stringify(error));
			throw error;
		}
	}

	static async getUpdatedRefreshToken(userId) {
		return RequestProcessor.processRefreshToken(userId);
	}

	static async pollAllUsersDataWithScheduler() {
		await this.pollAllUsersData();

		if(RateLimit.isAllDataProcessed()) {
			process.exit();
		}

		if(RateLimit.isAlreadySet) {
			let cronExpression = "*/"+ RateLimit.remainingSecondsUntilRefill +" * * * * *";
			
			Logger.debug("Invoking Scheduler: The scheduler will execute in every " 
			+ RateLimit.remainingSecondsUntilRefill + " seconds until all data is being processed!"
			+ "In each execution, ("+ RateLimit.totalQuota + " - 10%) requests per user will be processed!");
	
			Scheduler.init(cronExpression, this.pollAllUsersData.bind(this));
			Scheduler.start();
		}
	}

	static async pollAllUsersData() {
		let users = await DBManager.getAllUsers();

		Logger.debug("Total number of users: " + users.length);

		RateLimit.initProcessedUsers(users);

		for (const user of users) {
			Logger.debug("Processing user with user id: " + user.user_id);
			await this.pollUserData(user.user_id);
		}

		if(RateLimit.isAllDataProcessed()) {
			Logger.debug("All users processed sucessfully!");
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
			await this.processSummaryData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing summary data for user " + userId + ":", error, JSON.stringify(error));
			return;
		}

		try {
			await this.processTimeSeriesData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing Time Series data for user " + userId + ":", error, JSON.stringify(error));
			return;
		}
		
		try {
			await this.processIntradayData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing Intraday data for user " + userId + ":", error, JSON.stringify(error));
			return;
		}

		try {
			await RequestProcessor.processPagination(userId, tokenData.access_token, tokenData.fitbit_user_id, Config.resource.electrocardiogram, 10);
		} catch(error){
			Logger.error("Error while processing ecg data for user " + userId + ":", error, JSON.stringify(error));
		}

		Logger.debug(JSON.stringify(RateLimit.processedUsers))
		Logger.debug("Resetting the number of request processed to 0!");
		RateLimit.resetRequestProcessed();
	}

	static async processSummaryData(userId, accessToken, fitbitUserId) {
		try {
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.profile);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.devices);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.friends);
		} catch (error) {
			Logger.error("Error while processing profile, devices and friends for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.activityStatistics);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.activityGoals);
			// The endpoint for Activity Log List is correct but the request failed with status code 400.
			// Here is the url for the endpoint: https://dev.fitbit.com/build/reference/web-api/activity/get-activity-log-list/
			// await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.activityLogList);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.favoriteActivities);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.frequentActivities);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.recentActivities);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of activities for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.activitySummaryByDate);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of activities by date for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.bodyWeightGoals);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.bodyFatGoals);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of body for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.bodyWeightSummaryByDate);
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.bodyFatSummaryByDate);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of body by date for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.favoriteFoods);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.frequentFoods);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.recentFoods);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.foodGoals);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.foodWaterGoals);
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.meals);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of food for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.foodSummaryByDate);
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.foodWaterSummaryByDate);
		} catch (error) {
			Logger.error("Error while processing Summary or Details data of food by date for user " + userId);
			throw error;
		}
		
		try {
			await RequestProcessor.processSingleRequest(userId, accessToken, fitbitUserId, Config.resource.sleepGoals);
		} catch (error) {
			Logger.error("Error while processing sleep goals for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.coreTemperatureByDate);
			await RequestProcessor.processRequestByDate(userId, accessToken, fitbitUserId, Config.resource.skinTemperatureByDate);
		} catch (error) {
			Logger.error("Error while processing temperature for user " + userId);
			throw error;
		}
	}

	static async processTimeSeriesData(userId, accessToken, fitbitUserId) {
		try {
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.foodLogsCalories, 1095);
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.foodLogsWater, 1095);
		} catch (error) {
			Logger.error("Error while processing food log data for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.bodyBmi, 1095);
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.bodyFat, 1095);
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.bodyWeight, 1095);
		} catch (error) {
			Logger.error("Error while processing body bmi, fat and weight data for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.cardioFitnessScore, 30);
		} catch (error) {
			Logger.error("Error while processing cardio fitness score for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processTimeSeriesByDateRange(userId, accessToken, fitbitUserId, Config.resource.sleep, 100);
		} catch (error) {
			Logger.error("Error while processing sleep data for user " + userId);
			throw error;
		}
	}

	static async processIntradayData(userId, accessToken, fitbitUserId) {
		try {
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.heart, Config.detailLevel.oneSecond);
		} catch (error) {
			Logger.error("Error while processing heart rate data for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.activeZoneMinutes, Config.detailLevel.oneMinute);
		} catch (error) {
			Logger.error("Error while processing active zone minutes data for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.calories, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.distance, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.elevation, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.floors, Config.detailLevel.oneMinute);
			await RequestProcessor.processIntraday(userId, accessToken, fitbitUserId, Config.resource.steps, Config.detailLevel.oneMinute);
		} catch (error) {
			Logger.error("Error while processing activities data for user " + userId);
			throw error;
		}

		try {
			await RequestProcessor.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.resource.breathingRate, 30);
			await RequestProcessor.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.resource.heartRateVariability, 30);
			await RequestProcessor.processIntradayByInterval(userId, accessToken, fitbitUserId, Config.resource.spO2, 30);
		} catch (error) {
			Logger.error("Error while processing intraday data by interval for user " + userId);
			throw error;
		}
	}
}
module.exports = FitbitManager;
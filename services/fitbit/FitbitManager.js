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
		}
		catch (error) {
			Logger.error("Could not refresh access token for user " + userId + ": ", error, JSON.stringify(error));
			return;
		}
		
		try {
			await this.processTimeSeriesIntradayData(userId, tokenData.access_token, tokenData.fitbit_user_id);
		} catch (error) {
			Logger.error("Error while processing Time Series Intraday data for user " + userId + ":", error, JSON.stringify(error));
		}

		console.log(RateLimit.processedUsers)
		console.log("Resetting the number of request processed to 0!");
		RateLimit.resetRequestProcessed();
	}

	static async processTimeSeriesIntradayData(userId, accessToken, fitbitUserId) {
		try {
			await this.processHeartRate(userId, accessToken, fitbitUserId, Config.requestType.heart);
		} catch (error) {
			Logger.error("Error while processing heart rate data for user " + userId + ":", error, JSON.stringify(error));
		}

		try {
			await this.processActiveZoneMinute(userId, accessToken, fitbitUserId, Config.requestType.activeZoneMinutes);
		} catch (error) {
			Logger.error("Error while processing active zone minutes data for user " + userId + ":", error, JSON.stringify(error));
		}
	}

	static async processHeartRate(userId, accessToken, fitbitUserId, requestType) {
		console.log("Processing Heart Rate");
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateTimeRanges(startTimestamp, endTimestamp);

		console.log("RateLimit: "+RateLimit.totalQuota)
		console.log("Refill: "+RateLimit.remainingSecondsUntilRefill)
		console.log("Number of request remainig in processing Heart Rate: " + ranges.length);
		for (const range of ranges) {
			if(RateLimit.isLimitExceeded()) {
				console.log("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getHeartRateIntradayByDateAndTime(accessToken, fitbitUserId, range);
			await DBManager.storeTimeSeriesData(userId, requestType, range, response);

			RateLimit.requestProcessed();
		}
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}

	static async processActiveZoneMinute(userId, accessToken, fitbitUserId, requestType) {
		console.log("Processing Active Zone Minute");
		let startTimestamp = await FitbitHelper.getLastPolledTimestamp(userId, requestType);
		let endTimestamp = await FitbitHelper.getLastSyncedTimestamp(accessToken, fitbitUserId);
		const ranges = FitbitHelper.getDateTimeRanges(startTimestamp, endTimestamp);

		console.log("RateLimit: "+RateLimit.totalQuota);
		console.log("Refill: "+RateLimit.remainingSecondsUntilRefill);
		console.log("Number of request remainig in processing Active Zone Minute: " + ranges.length);
		for (const range of ranges) {
			if(RateLimit.isLimitExceeded()) {
				console.log("Request limit is exceeded!");
				RateLimit.setProcessedStatus(userId, false);
				break;
			}
			let response = await ApiManager.getActiveZoneMinuteIntradayByDateAndTime(accessToken, fitbitUserId, range);
			await DBManager.storeTimeSeriesData(userId, requestType, range, response);

			RateLimit.requestProcessed();
		}
		console.log("Total " + RateLimit.numberOfRequestProcessed + " Request processed successfully!");
	}
}
module.exports = FitbitManager;
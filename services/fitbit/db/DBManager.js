const FitbitToken = require("../../../models/FitbitToken");
const FitbitData = require("../../../models/FitbitData");
const DateTimeUtils = require("../DateTimeUtils");

/**
 * Represents a core class for database operations.
 * Provides methods for inserting, updating, and retrieving data from the database.
 */
class DBManager {
    // Inserts a new user record into the database.
    static async insertUser(userId, fitbitUserId, memberSince,
        tokenLastUpdated, accessToken, expirationDate, refreshToken, scope) {
        await FitbitToken.query()
            .insert({
                user_id: userId,
                fitbit_user_id: fitbitUserId,
                fitbit_member_since: memberSince,
                token_last_updated: tokenLastUpdated,
                access_token: accessToken,
                expiration_date: expirationDate,
                refresh_token: refreshToken,
                scope: scope
            });
    }

    // Updates an existing user record in the database.
    static async updateUser(user, fitbitUserId, tokenLastUpdated,
        accessToken, expirationDate, refreshToken, scope) {
        await user.$query().patch({
            fitbit_user_id: fitbitUserId,
            token_last_updated: tokenLastUpdated,
            access_token: accessToken,
            expiration_date: expirationDate,
            refresh_token: refreshToken,
            scope: scope
        });
    }

    // Updates an existing user in the database and and fetch the updated record.
    static async updateAndFetchUser(user, fitbitUserId, tokenLastUpdated,
        accessToken, expirationDate, refreshToken) {
        await user.$query().patchAndFetch({
            fitbit_user_id: fitbitUserId,
            token_last_updated: tokenLastUpdated,
            access_token: accessToken,
            expiration_date: expirationDate,
            refresh_token: refreshToken
        });
    }

    static async getUser(userId) {
        return await FitbitToken.query().findOne({ user_id: userId });
    }

    static async getAllUsers() {
        return await FitbitToken.query().distinct("user_id");
    }
    
    /**
     * Retrieves the last entry polled from the Fitbit API for a specific user and request type. 
     * @param {*} userId - The ID of the user for whom to retrieve the last polled entry.
     * @param {*} requestType - The type of request for which to retrieve the last polled entry.
     * @returns {Promise<Object>} A Promise resolving to the last polled entry from the database.
     */
    static async getLastPolledEntry(userId, requestType) {
        return await FitbitData.query().where({
            "user_id": userId,
            "request_type": requestType
        }).orderBy("request_timestamp", "DESC")
            .orderBy("to_timestamp", "DESC").first();
    }

    static async storeIntradayData(userId, requestType, range, response) {
        let fromTimestamp = DateTimeUtils.getTimestampFromDateAndTime(range.date, range.startTime);
        let toTimestamp = DateTimeUtils.getTimestampFromDateAndTime(range.date, range.endTime);
        let requestTimestamp = new Date();

        await this.insertData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    static async storeIntradayByIntervalData(userId, requestType, range, response) {
        await this.storeTimeSeriesByDateRange(userId, requestType, range, response);
    }

    static async storeTimeSeriesByDateRange(userId, requestType, range, response) {
        let fromTimestamp = DateTimeUtils.getTimestampFromDateAndTime(range.startDate, range.startTime);
        let toTimestamp = DateTimeUtils.getTimestampFromDateAndTime(range.endDate, range.endTime);
        let requestTimestamp = new Date();

        await this.insertData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    static async storeSummaryData(userId, requestType, response) {
        let requestTimestamp = new Date();
        let fromTimestamp = requestTimestamp;
        let toTimestamp = requestTimestamp;

        await this.insertData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    static async storeSummaryDataByDate(userId, requestType, range, response) {
        await this.storeIntradayData(userId, requestType, range, response);
    }

    static async storePaginatedData(userId, requestType, fromTimestamp, toTimestamp, response) {
        let requestTimestamp = new Date();
        await this.insertData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    // Inserts a new response or data into the database.
    static async insertData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, response) {
        await FitbitData.query().insert({
            user_id: userId,
            request_type: requestType,
            request_timestamp: requestTimestamp,
            from_timestamp: fromTimestamp,
            to_timestamp: toTimestamp,
            response: response
        });
    };
}

module.exports = DBManager;
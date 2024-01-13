const FitbitToken = require("../../../models/FitbitToken");
const FitbitData = require("../../../models/FitbitData");
const DateTimeUtils = require("../DateTimeUtils");
const Logger = require("../../../source/Loggers");

class DBManager {
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

        await this.insertTimeSeriesData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    static async storeIntradayByIntervalData(userId, requestType, range, response) {
        await this.storeTimeSeriesByDateRange(userId, requestType, range, response);
    }

    static async storeTimeSeriesByDateRange(userId, requestType, range, response) {
        let fromTimestamp = DateTimeUtils.getTimestampFromDateAndTime(range.startDate, range.startTime);
        let toTimestamp = DateTimeUtils.getTimestampFromDateAndTime(range.endDate, range.endTime);
        let requestTimestamp = new Date();

        await this.insertTimeSeriesData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    static async storeSummaryData(userId, requestType, response) {
        let requestTimestamp = new Date();
        let fromTimestamp = requestTimestamp;
        let toTimestamp = requestTimestamp;

        await this.insertTimeSeriesData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, JSON.stringify(response));
    }

    static async storeSummaryDataByDate(userId, requestType, range, response) {
        await this.storeIntradayData(userId, requestType, range, response);
    }

    static async insertTimeSeriesData(userId, requestType, requestTimestamp, fromTimestamp, toTimestamp, response) {
        try {
            await FitbitData.query().insert({
                user_id: userId,
                request_type: requestType,
                request_timestamp: requestTimestamp,
                from_timestamp: fromTimestamp,
                to_timestamp: toTimestamp,
                response: response
            });
        } catch (error) {
            Logger.error(error);
            throw error;
        }
    };
}

module.exports = DBManager;
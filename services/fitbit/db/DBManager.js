const FitbitToken = require("../../../models/FitbitToken");

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
}

module.exports = DBManager;
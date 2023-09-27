const FitbitApi = require('./FitbitApi')
const FitbitToken = require('../models/FitbitToken')
const { getDatetimeString } = require('../source/Utils');

class FitbitDataHub {
    static async registerUser(authorizationCode, userId) {
        try {
            const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, scope, token_type: tokenType, user_id: fitbitUserId } = await FitbitApi.apiSetup(authorizationCode)

            // Check if token already exists - if yes, update
            let existingToken = await FitbitToken.query().where({
                "user_id": userId
            })

            let now = new Date();
            let expirationDate = new Date
            expirationDate.setUTCSeconds(expirationDate.getUTCSeconds() + expiresIn);

            let nowDatetimeString = getDatetimeString(now)
            let expirationDateDatetimeString = getDatetimeString(expirationDate)

            // Ensure that no two (internal) users share the same fitbit_user_id to avoid data corruption
            if (existingToken.length > 0) {
                await FitbitToken.query().findOne({
                    user_id: userId
                }).patch({
                    fitbit_user_id: fitbitUserId,
                    token_last_updated: nowDatetimeString,
                    access_token: accessToken,
                    expiration_date: expirationDateDatetimeString,
                    refresh_token: refreshToken,
                    scope: scope
                })
            } else {
                await FitbitToken.query().insert({
                    user_id: userId,
                    fitbit_user_id: fitbitUserId,
                    token_last_updated: nowDatetimeString,
                    access_token: accessToken,
                    expiration_date: expirationDateDatetimeString,
                    refresh_token: refreshToken,
                    scope: scope
                })
            }
        } catch (error) {
            console.error(error)
            throw error;
        }
    }
}

module.exports = FitbitDataHub;
const FitbitApi = require('./FitbitApi')
const FitbitToken = require('../models/FitbitToken')
const { getDatetimeString } = require('../source/Utils');

var logger = require('winston');

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

    static async refreshUserToken(userId) {
        try {
            // Check if user was initially registered for the use with Fitbit API
            let userFitbitTokenRecord = await FitbitToken.query().findOne({
                user_id: userId
            })

            if (!userFitbitTokenRecord) {
                throw new UserTokenNotFoundError;
            }

            // Get the refresh token through the Fitbit API Wrapper
            const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, token_type: tokenType, user_id: fitbitUserId } = await FitbitApi.refreshToken(userFitbitTokenRecord.refresh_token)

            // Calculate new timestamps
            let now = new Date();
            let expirationDate = new Date
            expirationDate.setUTCSeconds(expirationDate.getUTCSeconds() + expiresIn);

            let nowDatetimeString = getDatetimeString(now)
            let expirationDateDatetimeString = getDatetimeString(expirationDate)

            // Insert updated user data into database
            await userFitbitTokenRecord.$query().patchAndFetch({
                fitbit_user_id: fitbitUserId,
                token_last_updated: nowDatetimeString,
                access_token: accessToken,
                expiration_date: expirationDateDatetimeString,
                refresh_token: refreshToken
            })

            return userFitbitTokenRecord
        } catch (error) {
            throw error;
        }
    }

    static async dataPollBatchUser(userId) {
        try {
            let tokenData = await this.refreshUserToken(userId)
            console.log("Token Data:", tokenData)
        }
        catch (err) {
            logger.error("Could not refresh access token for user " + userId + ": ", err, JSON.stringify(err));
            return;
        }
    }
}

module.exports = FitbitDataHub;
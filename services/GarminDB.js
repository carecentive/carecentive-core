const {GarminUser, GarminApiResponse, GarminDevUser} = require("../models/GarminModels")
const moment = require('moment');

class GarminDBManager {
  /**
   * Saves or updates a Garmin user's OAuth tokens in the database.
   * 
   * @param {number} puserId - The internal user ID.
   * @param {string} garminUserId - The Garmin user's identifier.
   * @param {string} garminAccessToken - The OAuth access token for Garmin API.
   * @param {string} garminAccessSecret - The OAuth access secret for Garmin API.
   */
  static async saveOrUpdateGarminUser(userId, garminUserId, garminAccessToken, garminAccessSecret) {
    const existingUser = await GarminUser.query().findOne({ user_id: userId });
    if (existingUser) {
      await GarminUser.query()
        .patch({
          garmin_access_token: garminAccessToken,
          garmin_access_secret: garminAccessSecret,
        })
        .where({ user_id: userId });
        console.log("Updated accessToken and accessSecret for userID: ", userId);
    } else {
      await GarminUser.query().insert({
        user_id: userId,
        garmin_user_id: garminUserId,
        garmin_access_token: garminAccessToken,
        garmin_access_secret: garminAccessSecret,
      });
      console.log("Created row with garminUserId, accessToken and accessSecret for userID: ", userId);
    }
  }

  /**
   * Handles and stores the API response for a user.
   * 
   * @param {number} userId - The internal user ID.
   * @param {Object} apiResponse - The response from the Garmin API to store.
   * @param {string} responseType - The type of the response (e.g., 'activity', 'daily_summary').
   * @param {string} responseDate - The date of the API response in 'YYYY-MM-DD' format.
   */
  static async handleApiResponse(userId, apiResponse, responseType, responseDate) {
    // Convert date to calendarDate to be sure
    const formattedDate = moment(responseDate).format("YYYY-MM-DD");

    if(responseType == "activity"){
        await GarminApiResponse.query().insert({
            user_id: userId,
            response_type: responseType,
            response_data: JSON.stringify(apiResponse),
            response_date: formattedDate,
        });
        console.log("Inserted activity data from the %s for userId %s", responseDate, userId);
      }
    else{
        // Check for an existing row for the same user, responseType, and responseDate
        const existingResponse = await GarminApiResponse.query()
        .findOne({ user_id: userId, response_type: responseType, response_date: formattedDate });

        if (existingResponse) {
        // Update existing row if it exists
        await GarminApiResponse.query()
            .patch({ response_data: JSON.stringify(apiResponse) })
            .where({ id: existingResponse.id });
            console.log("Updated %s data from the %s for userId %s", responseType, responseDate, userId);
        } else {
        // Insert new row otherwise
        await GarminApiResponse.query().insert({
            user_id: userId,
            response_type: responseType,
            response_data: JSON.stringify(apiResponse),
            response_date: formattedDate,
        });
        console.log("Inserted %s data from the %s for userId %s", responseType, responseDate, userId);
        }
    }
  }
  /**
   * Retrieves the most recent timestamp (in Unix format) for when data was last fetched for a specific user and API type.
   * If no data fetches have been recorded, it falls back to the user's consent date.
   * 
   * @param {number} userId - The ID of the user.
   * @param {string} apiType - The type of API data being queried (e.g., 'daily_summary').
   * @returns {Promise<number|null>} The last fetched timestamp in Unix format, or null if not available.
   */
  static async getLastFetchedTimestamp(userId, apiType) {
    // Attempt to find the most recent response for the given user and API type
    if (!userId || !apiType) {
        console.log(`Invalid parameters for getLastFetchedTimestamp: userId=${userId}, apiType=${apiType}`);
        return null;
    }

    const mostRecentResponse = await GarminApiResponse.query()
      .where({ user_id: userId, response_type: apiType })
      .orderBy('updated_at', 'desc')
      .first();
    if (mostRecentResponse) {
      return moment(mostRecentResponse.updated_at, "YYYY-MM-DD hh:mm:ss").startOf('day').unix();
    } else {
      // If no response is found, fall back to the user's consent date
      const user = await GarminUser.query().where('user_id', userId).first();
      if (user && user.created_at) {
        return moment(user.created_at, "YYYY-MM-DD hh:mm:ss").startOf('day').unix();
      }
    }

    return null; // Return null if neither a response date nor a consent date is available
  }

  /**
   * Finds a user by their internal user ID.
   * 
   * @param {number} userId - The internal user ID to find.
   * @returns {Promise<Object|null>} The user object if found, otherwise null.
   */
  static async findByUserId(userId) {
    return GarminUser.query().where('user_id', userId).first();
  }

  /**
   * Finds a Garmin user by their Garmin user ID.
   * 
   * @param {string} garminUserId - The Garmin user ID to find.
   * @returns {Promise<Object|null>} The Garmin user object if found, otherwise null.
   */
  static async findByGarminUserId(garminUserId) {
    return GarminUser.query().findOne({ garmin_user_id: garminUserId });
  }

  /**
   * Retrieves all user IDs from users with registered Garmin Connect accounts.
   * 
   * @returns {Promise<Array<number>>} An array of internal user IDs.
   */
  static async getAllUserIds() {
    const users = await GarminUser.query().select('user_id');
    return users.map(user => user.user_id);
  }

  /**
   * Retrieves the access token and secret for a user by their internal ID.
   * 
   * @param {number} userId - The internal user ID.
   * @returns {Promise<Object>} An object containing the accessToken and accessSecret.
   */
  static async getAccessTokenAndSecret(userId) {
    const result = await GarminUser.query().where('user_id', userId).first().select('garmin_access_token', 'garmin_access_secret');
    if (!result) throw new Error('Garmin user not found.');
    return { accessToken: result.garmin_access_token, accessSecret: result.garmin_access_secret };
  }

  /**
   * Retrieves the global Garmin developer consumer credentials. Assumes only one set of credentials exists.
   * 
   * @returns {Promise<Object>} An object containing the consumerKey and consumerSecret.
   */
  static async getConsumerCredentials() {
    const result = await GarminDevUser.query().first().select('consumer_key', 'consumer_secret');
    if (!result) throw new Error('API consumer credentials not found.');
    return { consumerKey: result.consumer_key, consumerSecret: result.consumer_secret };
  }


  /**
   * Retrieves the latest timestamp for all API requests for a user based on their internal user ID.
   * 
   * @param {number} userId - The internal user ID.
   * @returns {Promise<string|null>} The latest timestamp if available, otherwise null.
   */
  static async getLatestTimestamp(userId) {
    const latestResponse = await GarminApiResponse.query()
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();
    return latestResponse ? latestResponse.timestamp : null;
  }

}

module.exports = { GarminUser, GarminApiResponse, GarminDevUser, GarminDBManager };
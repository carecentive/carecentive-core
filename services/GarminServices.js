// services.js

const crypto = require('crypto');
const axios = require('axios');
const db = require('./GarminDBManager');
const moment = require('moment');
const { error } = require('console');

const garminConsumerKey = process.env.GARMIN_CONSUMERKEY;
const garminConsumerSecret = process.env.GARMIN_CONSUMERSECRET;

/**
 * Generates a HMAC-SHA1 signature for OAuth 1.0.
 * @param {string} baseString - The base string to sign.
 * @param {string} key - The signing key.
 * @returns {string} The generated signature.
 */
const generateSignature = (baseString, key) => {
  return crypto.createHmac('sha1', key).update(baseString).digest('base64');
};

/**
 * Groups an array of items by a specified key.
 * Useful for aggregating API response items by a common attribute, such as a date.
 * @param {Array} array - The array of items to group.
 * @param {string} key - The attribute to group by.
 * @returns {Object} An object where each key is a unique value of the attribute, and its value is an array of items having that attribute value.
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

/**
 * Constructs a complete URL with appended query parameters for API requests.
 * @param {string} baseUrl - The base URL of the API endpoint.
 * @param {Object} queryParams - A key-value map of query parameters.
 * @returns {string} The constructed URL with encoded query parameters.
 */
const buildApiUrl = (baseUrl, queryParams) => {
    const queryString = Object.entries(queryParams)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };


/**
 * Handles making API requests, including constructing the authorization header, handling errors, and processing the response.
 * @param {string} url - The API endpoint.
 * @param {number} userId - The user ID for which data is being requested.
 * @param {string} responseType - The type of data being requested (e.g., 'daily_summary').
 * @param {number} uploadStartTimeInSeconds - The start time for the data request, in Unix seconds.
 * @param {number} uploadEndTimeInSeconds - The end time for the data request, in Unix seconds.
 * @param {Date} timenow - Current timestamp for logging purposes.
 * @returns {Promise} A promise that resolves with the API response data.
 */ 
const makeApiRequest = async (url, userId, responseType, uploadStartTimeInSeconds, uploadEndTimeInSeconds) => {

    // Validate time range does not exceed 24 hours
    if((uploadEndTimeInSeconds - uploadStartTimeInSeconds) > 86400){
      console.error("Cannot request timespans longer than 24 hours (86400) seconds to Garmin API, please define other input parameters");
      throw error;
    }
    const queryParams = {
        uploadStartTimeInSeconds,
        uploadEndTimeInSeconds,
      };
    
    const fullUrl = buildApiUrl(url, queryParams);

    // OAuth data preparation
    const oauthData = {
        oauth_consumer_key: garminConsumerKey,
        oauth_token: (await db.GarminDBManager.getAccessTokenAndSecret(userId)).accessToken,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000),
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_version: '1.0',
        uploadStartTimeInSeconds: uploadStartTimeInSeconds,
        uploadEndTimeInSeconds: uploadEndTimeInSeconds,
    };
    // Sort parameters alphabetically
    const normalizedParams = Object.entries(oauthData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

    const baseString = 'GET&' + encodeURIComponent(url) + '&' + encodeURIComponent(normalizedParams);

    const signingKey = `${encodeURIComponent(garminConsumerSecret)}&${encodeURIComponent((await db.GarminDBManager.getAccessTokenAndSecret(userId)).accessSecret)}`;

    const signature = generateSignature(baseString, signingKey);

    const authorizationHeader = `OAuth oauth_version="1.0", ` +
        `oauth_consumer_key="${encodeURIComponent(oauthData.oauth_consumer_key)}", ` +
        `oauth_token="${encodeURIComponent(oauthData.oauth_token)}", ` +
        `oauth_signature_method="${encodeURIComponent(oauthData.oauth_signature_method)}", ` +
        `oauth_timestamp="${oauthData.oauth_timestamp}", ` +
        `oauth_nonce="${encodeURIComponent(oauthData.oauth_nonce)}", ` +
        `oauth_signature="${encodeURIComponent(signature)}"`;

    try {
        const response = await axios.get(fullUrl, {
        headers: { Authorization: authorizationHeader },
        });


        // Process the response
        if(responseType != "activity"){

          // Aggregated data handling
          const groupedData = groupBy(response.data, 'calendarDate');
          
          for (const date in groupedData) {
            if (groupedData.hasOwnProperty(date)) {
              const itemsForDate = groupedData[date];
          
              // Find the item with the maximum durationInSeconds
              const maxDurationItem = itemsForDate.reduce((maxItem, currentItem) => {
                return currentItem.durationInSeconds > maxItem.durationInSeconds ? currentItem : maxItem;
              }, itemsForDate[0]);
          
              // Passing item with maximum duration to database handler
              await db.GarminDBManager.handleApiResponse(userId, maxDurationItem, responseType, maxDurationItem.calendarDate);
            }
          }
        }
        else{

          // Activity data handling
          for (const activity of response.data) {
            // Convert startTimeInSeconds to a calendarDate
            const date = new Date(activity["startTimeInSeconds"] * 1000);

            // Converts to YYYY-MM-DD format
            const calendarDate = date.toISOString().split('T')[0];

            // Passing acitvity to databse
            await db.GarminDBManager.handleApiResponse(userId, activity, responseType, calendarDate);
          }
        }
        
        //await responseHandler(userId, response.data, timenow);
        return response.data;
    } catch (error) {
        console.error('Error fetching data from API:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// Fetching functions for different types of summaries from Garmin API
/**
 * Fetches daily summaries for a given user within the specified time span.
 * @param {number} userId - The user's ID.
 * @param {number} starttime - The start time in seconds.
 * @param {number} endtime - The end time in seconds.
 * @returns {Promise} A promise that resolves with the fetched summaries.
 */
const getDailySummaries = async (userId, starttime, endtime) => {
    const url = 'https://apis.garmin.com/wellness-api/rest/dailies';
  
    await makeApiRequest(url, userId, "daily_summary", starttime, endtime);
  };
  
const getSleepSummaries = async (userId, starttime, endtime) => {
  const url = 'https://apis.garmin.com/wellness-api/rest/epochs';

  await makeApiRequest(url, userId, "sleep_summary", starttime, endtime);
};

const getActivities = async (userId, starttime, endtime) => {
  const url = 'https://apis.garmin.com/wellness-api/rest/activities';

  await makeApiRequest(url, userId, "activity", starttime, endtime);
};


/**
 * Fetches and processes all Garmin API data for one registered Garmin users.
 * @param {number} userId - userId the data is supposed to be pulled for
 * @param {number} startTime - The start time in seconds.
 * @param {number} endTime - The end time in seconds.
 */
const getAllDataOneUser = async (userId, startTime, endTime) => {
  try {

      const apiTypes = ['daily_summary', 'activity', 'sleep_summary'];
      for (const apiType of apiTypes) {
        await execAPI(userId, apiType, startTime, endTime)
      }

      console.log(`Data fetched and processed for user ${userId}`);
  }
  catch (error) {
      console.error('Error fetching data for all users:', error);
  }
};

/**
 * Fetches and processes one type of Garmin API data for all registered Garmin users.
 * @param {string} response_type - The type of Garmin API data to be pulled (daily_summary, sleep_summary, activity)
 * @param {number} startTime - The start time in seconds.
 * @param {number} endTime - The end time in seconds.
 */
const getOneDataAllUsers = async (api_type, startTime, endTime) => {
  try {
      const users = await db.GarminDBManager.getAllUserIds();

      for (const user of users) {
          const userId = user.user_id;
          await execAPI(userId, api_type, startTime, endTime);
          console.log(`Data fetched and processed for user ${userId}`);
      }
  } catch (error) {
      console.error('Error fetching data for all users:', error);
  }
};

/**
 * Fetches and processes all Garmin API data for all registered Garmin users.
 * @param {number} startTime - The start time in seconds.
 * @param {number} endTime - The end time in seconds.
 */
const getAllDataAllUsers = async (startTime, endTime) => {
  try {
      const users = await db.GarminDBManager.getAllUserIds();
      const apiTypes = ['daily_summary', 'activity', 'sleep_summary'];
      for (const user of users) {
          const userId = user.user_id;

          for (const apiType of apiTypes) {
            await execAPI(userId, apiType, startTime, endTime)
          }

          console.log(`Data fetched and processed for userId ${userId}`);
      }
  } catch (error) {
      console.error('Error fetching data for all users:', error);
  }
};


/**
 * CAUTION: If no garmin developer production application keys are used, rate limiting can cause issues here
 * For each user, queries all api types starting from the last time data from the individual api was pulled until time of the function call
 */
const getAllDataAllUsersTimeless = async () => {
  try {
    const users = await db.GarminDBManager.getAllUserIds();
    const apiTypes = ['daily_summary', 'activity', 'sleep_summary'];
    for (const userId of users) {

        for (const apiType of apiTypes) {
            let startTime = await db.GarminDBManager.getLastFetchedTimestamp(userId, apiType);
            const endTime = moment().unix();

            // Loop from the last timestamp to the current date in 86400 second increments (max timeframe allowed for API request)
            while (startTime < endTime) {
                const nextEndTime = Math.min(startTime + 86400, endTime);
                await execAPI(userId, apiType, startTime, nextEndTime);
                startTime = nextEndTime;
            }
        }

        console.log(`Data fetched and processed for userId ${userId}`);
    }
} catch (error) {
    console.error('Error fetching data for all users:', error);
}
};

async function execAPI(userId, apiType, startTime, endTime) {
  console.log(`Fetching ${apiType} for user ${userId} from ${Date(startTime*1000)} to ${Date(endTime*1000)}`);
  switch(apiType){
    case "daily_summary":
      await getDailySummaries(userId, startTime, endTime);
      break;
    case "sleep_summary":
      await getSleepSummaries(userId, startTime, endTime);
      break;
    case "activity":
      await getActivities(userId, startTime, endTime);
      break;
  }
}

module.exports = {
  getDailySummaries,
  getSleepSummaries,
  getActivities,
  getOneDataAllUsers,
  getAllDataOneUser,
  getAllDataAllUsers,
  execAPI,
  getAllDataAllUsersTimeless,
};
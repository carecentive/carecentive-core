const axios = require('axios');
const WithingsApi = require('./WithingsApi');

const { Model } = require('objection');
const User = require('../models/User');

const WithingsToken = require('../models/WithingsToken');
const WithingsRawRequest = require('../models/WithingsRawRequest');

const { getDatetimeString, dateToTimestamp, getNowAsTimestamp, sortObjectByKeys } = require('../source/Utils');

const { UserTokenNotFoundError } = require('../source/Errors')

const { promisify } = require('util')
const sleep = promisify(setTimeout)

const moment = require('moment');

var logger = require('winston');

/**
 * Summary of more or less abstract functions to run (wearable data) API requests.
 * Currently solely used for Withings API.
 */

class WithingsDataHub {

  /**
   * WITHINGS API FACED FUNCTIONS
   */

  /**
   * Set the user up in order to access his/her Withings data
   * 
   * @param {*} authorizationCode Authorization code gained from a previous Withings API request
   * @param {*} userId Internal user ID of the data hub (this software)
   */
  static async registerUser(authorizationCode, userId) {
    try {
      const [withingsUserId, accessToken, refreshToken, scope, expiresIn] = await WithingsApi.apiSetup(authorizationCode)
      
      // Check if token already exists - if yes, update
      let existingToken = await WithingsToken.query().where({
        "user_id": userId
      })

      let now = new Date();
      let expirationDate = new Date
      expirationDate.setUTCSeconds(expirationDate.getUTCSeconds() + expiresIn);

      let nowDatetimeString = getDatetimeString(now)
      let expirationDateDatetimeString = getDatetimeString(expirationDate)

      // TODO: Ensure that no two (internal) users share the same withings_user_id to avoid data corruption

      if(existingToken.length > 0) {
        await WithingsToken.query().findOne({
          user_id: userId
        }).patch({
          withings_user_id: withingsUserId,
          token_last_updated: nowDatetimeString,
          access_token: accessToken,
          expiration_date: expirationDateDatetimeString,
          refresh_token: refreshToken,
          scope: scope
        })
      }

      else {
        await WithingsToken.query().insert({
          user_id: userId,
          withings_user_id: withingsUserId,
          token_last_updated: nowDatetimeString,
          access_token: accessToken,
          expiration_date: expirationDateDatetimeString,
          refresh_token: refreshToken,
          scope: scope
        })
      }      
    } catch (err) {
      // Propagate error to next error handler, as error handling is done in either middleware or route controller
      throw err
    }
  }

  /**
   * Update the user's Withings API refresh token. 
   * @param {*} userId 
   */
  static async refreshUserToken(userId) {

    // Check if user was initially registered for the use with Withings API
    let userWithingsTokenRecord = await WithingsToken.query().findOne({
      user_id: userId
    })

    if(!userWithingsTokenRecord) {
      throw new UserTokenNotFoundError;
    }

    // Get the refresh token through the Withings API Wrapper
    const [withingsUserId, accessToken, refreshToken, scope, expiresIn] = await WithingsApi.refreshToken(userWithingsTokenRecord.refresh_token)

    // Calculate new timestamps
    let now = new Date();
    let expirationDate = new Date
    expirationDate.setUTCSeconds(expirationDate.getUTCSeconds() + expiresIn);

    let nowDatetimeString = getDatetimeString(now)
    let expirationDateDatetimeString = getDatetimeString(expirationDate)

    // Insert updated user data into database
    await userWithingsTokenRecord.$query().patchAndFetch({
      withings_user_id: withingsUserId,
      token_last_updated: nowDatetimeString,
      access_token: accessToken,
      expiration_date: expirationDateDatetimeString,
      refresh_token: refreshToken,
      scope: scope
    })

    return userWithingsTokenRecord
  }

  /**
   * Poll the data of all available users and save it into the database.
   */
  static async dataPollBatch() {

    var self = this;

    // find all users with Withings details
    // In theory, there should not be more than one row per user - but we're using distinct just to go sure
    let users = await WithingsToken.query().distinct("user_id")

    if (!users.length > 0) {
      throw new Error("No users in database.")
    }

    // for each user, poll the currently existing data
    console.log("Starting to fetch data of " + users.length + " users.")
    let userCount = 0

    while(userCount < users.length) {
      await self.dataPollBatchUser(users[userCount].user_id)
      userCount = userCount + 1
      console.log("Completed data poll " + userCount + " out of " + users.length)
    }
  }

  /**
   * Poll and update data of specified user.
   * @param {*} userId Data Hub user ID that should be updated.
   */
  static async dataPollBatchUser(userId) {

    let token;
    // Update and get latest token
    try {
      let tokenData = await this.refreshUserToken(userId)
      token = tokenData.access_token  
    }

    catch (err) {
      logger.error("Could not refresh access token for user " + userId + ": ", err, JSON.stringify(err));
      return;
    }

    // Poll data from all supporting API endpoints
    // Sleep required to ensure that no throttling (by Withings) occurs
    await sleep(1000);

    try {
      await this.getMeasAndECGByLastUpdate(userId, token);
    }
    catch (err) {
      logger.error("Error in getMeasAndECGByLastUpdate for user ID " + userId + ": ", err, JSON.stringify(err));
    }
    
    await sleep(1000);

    try {
      await this.getActivityByLastUpdate(userId, token)
    }
    catch (err) {
      logger.error("Error in getActivityByLastUpdate for user ID " + userId + ": ", err, JSON.stringify(err));
    }

    await sleep(1000);

    try {
      await this.getWorkoutsByLastUpdate(userId, token)
    }
    catch (err) {
      logger.error("Error in getWorkoutsByLastUpdate for user ID " + userId + ": ", err, JSON.stringify(err));
    }


    await sleep(1000);

    try {
      await this.sleepGetSummaryByLastUpdate(userId, token)
    }
    catch (err) {
      logger.error("Error in sleepGetSummaryByLastUpdate for user ID " + userId + ": ", err, JSON.stringify(err));
    }
  }

  /**
   * Return the timestamp of the last updated
   * @param {*} userId 
   * @param {*} requestType 
   * @returns 
   */

  static async getRequestLastUpdated(userId, requestType) {
    let lastRawRequest = await WithingsRawRequest.query().where({
      "user_id": userId,
      "request_type": requestType
    }).orderBy("request_timestamp", "DESC").first();

    let lastRequestDatetime;

    // If no last request has been found, use the user registration date
    if(!lastRawRequest) {
      let user = await User.query().findById(userId);
      lastRequestDatetime = user.created_at;  
      console.log("user created at: " + lastRequestDatetime);
    }
    else {
      lastRequestDatetime = lastRawRequest.request_timestamp
    }

    if(!lastRequestDatetime) {
      return undefined;
    }

    return dateToTimestamp(lastRequestDatetime)
  }


  /**
   * Helper function to ensure that all data (including data on subsequent pages) is retrieved.
   * Automatically runs subsequent requests if Withings API "more"-response is set in order to receive the complete data.
   * 
   * @param {int} userId Data Hub internal user ID
   * @param {String} token Access token (Bearer) for Withings API
   * @param {URL} endpointUrl Endpoint URL according to Withings API documentation
   * @param {String} action Action name according to Withings API documentation
   * @param {Object} requestParameters Remaining request parameters according to Withings API documentation
   * @param {function} resultParseFunction (userId, token, result) This function will be called to parse the result; this function must ensure that apiThrottlingLimit is respected
   */
  static async apiOffsetHandler (userId, token, endpointUrl, action, requestParameters, resultParseFunction) {
    
    
    // Perform initial request
    let result = await WithingsApi.apiRequest(token, endpointUrl, action, requestParameters)

    // Save withings raw request to database
    let nowTimestamp = new Date()

    // Process the result if resultParseFunction is defined
    // This may be useful to gather additional data (e.g. in a finer granularity)
    // NOTE: The order is on purpose
    // First call the "parse" functions. If they fail, no database entry for the "parent"
    // Function will be created. The parent function will thus be called again in consecutive
    // runs, which allows for bugfixing (e.g. when called with a lastupdate-parameter).

    if(resultParseFunction !== undefined && typeof resultParseFunction === 'function') {
      // "This" is not yet available in the passed function; 
      // First bind "this" to make "this" available to the called function
      resultParseFunction = resultParseFunction.bind(this);
      await resultParseFunction(userId, token, result);
    }

    await WithingsRawRequest.query().insert({
      user_id: userId,
      request_type: action,
      request_timestamp: nowTimestamp,
      startdate: requestParameters.startdate,
      enddate: requestParameters.enddate,
      startdateymd: requestParameters.startdateymd,
      enddateymd: requestParameters.enddateymd,
      lastupdate: requestParameters.lastupdate,
      type_fields: requestParameters.type_fields,
      more: false,
      response: JSON.stringify(result)
    })

    // If more than one page, add further requests
    if (result.more) {
      do {
        await sleep(1000);
        requestParameters["offset"] = result.offset
        result = await WithingsApi.apiRequest(token, endpointUrl, action, requestParameters)

        if(resultParseFunction !== undefined && typeof resultParseFunction === 'function') {
          await resultParseFunction(userId, token, result);
        }
        
        await WithingsRawRequest.query().insert({
          user_id: userId,
          request_type: action,
          request_timestamp: nowTimestamp,
          startdate: requestParameters.startdate,
          enddate: requestParameters.enddate,
          startdateymd: requestParameters.startdateymd,
          enddateymd: requestParameters.enddateymd,
          lastupdate: requestParameters.lastupdate,
          type_fields: requestParameters.type_fileds,    
          more: true,
          offset: requestParameters["offset"],
          response: JSON.stringify(result)
        })
      }
      while(result.more)

    }
  }

  static async getMeasAndECGByLastUpdate(userId, token) {
    // pull last update from DB
    let lastUpdatedTimestamp = await this.getRequestLastUpdated(userId, "getmeas")

    // If there has not been any previous result, get all the data until now
    if (!lastUpdatedTimestamp) {

      lastUpdatedTimestamp = 0;
    }

    // First: Getmeas
    let requestParameters = {
      "meastypes": "1, 4, 5, 6, 8, 9, 10, 11, 12, 54, 71, 73, 76, 77, 88, 91, 123",
      "category": 1,
      "lastupdate": lastUpdatedTimestamp
    }

    await this.apiOffsetHandler(userId, token, "https://wbsapi.withings.net/measure", "getmeas", requestParameters)

    // Second: Heart List
    requestParameters = {
      startdate: lastUpdatedTimestamp,
      enddate: Math.round((Date.now()/1000),0)
    }

    await this.apiOffsetHandler(userId, token, "https://wbsapi.withings.net/v2/heart", "list", requestParameters, this.handleHeartList)
  }

  static async handleHeartList(userId, token, result) {
    for (let entry of result.series) {
      if(entry.ecg && entry.ecg.signalid) {
        let requestParameters = {
          signalid: entry.ecg.signalid,
        }
        await this.apiOffsetHandler(userId, token, "https://wbsapi.withings.net/v2/heart", "get", requestParameters)
        await sleep(1000);
      }      
    }
  }
  
  static async getActivityByLastUpdate(userId, token) {
    // pull last update from DB
    let lastUpdatedTimestamp = await this.getRequestLastUpdated(userId, "getactivity")

    // If there has not been any previous result, get all the data until now
    if (!lastUpdatedTimestamp) {
      lastUpdatedTimestamp = 0;
    }

    let requestParameters = {
      "data_fields": "steps,distance,elevation,soft,moderate,intense,active,calories,totalcalories,hr_average,hr_min,hr_max,hr_zone_0,hr_zone_1,hr_zone_2,hr_zone_3",
      "lastupdate": lastUpdatedTimestamp
    }

    await this.apiOffsetHandler(userId, token, "https://wbsapi.withings.net/v2/measure", "getactivity", requestParameters, this.handleActivityByLastUpdateDataToGetintradayactivity)
  }

  static async handleActivityByLastUpdateDataToGetintradayactivity(userId, token, result) {

    for (let key in result.activities) {
      await this.getIntradayActivityByDate(userId, token, result.activities[key].date);
      await sleep(1000);
    }
  }

  static async getIntradayActivityByDate(userId, token, date) {
    let startdateTimestamp = moment(date).utc().startOf('day').unix();
    let enddateTimestamp = moment(date).utc().endOf('day').unix();

    let nowTimestamp = new Date()

    let requestParameters = {
      "data_fields": "steps,elevation,calories,distance,stroke,pool_lap,duration,heart_rate,spo2_auto",
      startdate: startdateTimestamp,
      enddate: enddateTimestamp
    }

    let result = await WithingsApi.apiRequest(token, "https://wbsapi.withings.net/v2/measure", "getintradayactivity", requestParameters)

    await WithingsRawRequest.query().insert({
      user_id: userId,
      request_type: "getintradayactivity",
      request_timestamp: nowTimestamp,
      startdate: requestParameters.startdate,
      enddate: requestParameters.enddate,
      startdateymd: requestParameters.startdateymd,
      enddateymd: requestParameters.enddateymd,
      lastupdate: requestParameters.lastupdate,
      type_fields: requestParameters.type_fields,    
      more: false,
      offset: requestParameters["offset"],
      response: JSON.stringify(result)
    })
  }

  static async getWorkoutsByLastUpdate(userId, token) {
    // pull last update from DB
    let lastUpdatedTimestamp = await this.getRequestLastUpdated(userId, "getworkouts")

    // If there has not been any previous result, get all the data until now
    if(!lastUpdatedTimestamp) {
      lastUpdatedTimestamp = 0;
    }

    let requestParameters = {
      "data_fields": "calories,effduration,intensity,manual_distance,manual_calories,hr_average,hr_min,hr_max,hr_zone_0,hr_zone_1,hr_zone_2,hr_zone_3,pause_duration,algo_pause_duration,spo2_average,steps,distance,elevation,pool_laps,strokes,pool_length",
      "lastupdate": lastUpdatedTimestamp
    }

    await this.apiOffsetHandler(userId, token, "https://wbsapi.withings.net/v2/measure", "getworkouts", requestParameters)
  }

  static async sleepGetSummaryByLastUpdate(userId, token) {
    // pull last update from DB
    let lastUpdatedTimestamp = await this.getRequestLastUpdated(userId, "getsummary")

    // If there has not been any previous result, get all the data until now
    if (!lastUpdatedTimestamp) {
      lastUpdatedTimestamp = 0;
    }

    let requestParameters = {
      "data_fields": "nb_rem_episodes,sleep_efficiency,sleep_latency,total_sleep_time,total_timeinbed,wakeup_latency,waso,breathing_distrubances_intensity,deepsleepduration,durationtosleep,durationtowakeup,hr_average,hr_max,hr_min,lightsleepduration,out_of_bed_count,remsleepduration,rr_average,rr_max,rr_min,sleep_score,snoring,snoringepisodecount,wakeupcount,wakeupduration",
      "lastupdate": lastUpdatedTimestamp
    }

    await this.apiOffsetHandler(userId, token, "https://wbsapi.withings.net/v2/sleep", "getsummary", requestParameters, this.handlesleepGetSummaryByLastUpdateToSleepGet)
  }

  static async handlesleepGetSummaryByLastUpdateToSleepGet(userId, token, result) {
    for (let key in result.series) {
      // TODO: If not start and enddate set
      await this.getSleepByStartEndTimestamp(userId, token, result.series[key].startdate, result.series[key].enddate);
      await sleep(1000);
    }
  }

  static async getSleepByStartEndTimestamp(userId, token, startTimestamp, endTimestamp) {
    let nowTimestamp = new Date()

    let requestParameters = {
      "data_fields": "hr,rr,snoring",
      startdate: startTimestamp,
      enddate: endTimestamp
    }

    let result = await WithingsApi.apiRequest(token, "https://wbsapi.withings.net/v2/sleep", "get", requestParameters)

    await WithingsRawRequest.query().insert({
      user_id: userId,
      request_type: "get",
      request_timestamp: nowTimestamp,
      startdate: requestParameters.startdate,
      enddate: requestParameters.enddate,
      startdateymd: requestParameters.startdateymd,
      enddateymd: requestParameters.enddateymd,
      lastupdate: requestParameters.lastupdate,
      type_fields: requestParameters.type_fields,    
      more: false,
      offset: requestParameters["offset"],
      response: JSON.stringify(result)
    })

  }

  
  /**
   * DATABASE FACED FUNCTIONS FOR DATA POLLING
   */

  /**
   * Get activity data stored in the database for a specific user
   * Uses data that is stored in the local database, does NOT perform any API requests to Withings
   * Withings endpoint: getactivity
   * 
   * @param {*} userId 
   * @returns object Activity information, stored in the form of {date => {data},...}
   */
  static async getActivityDataFromDatabase(userId) {

  /**
   * Informations about this request:
   * - whereRaw NOT LIKE activities:[] 
   * -- Ensures that we only pick "non-empty" activity responses
   * - orderBy ID ASC
   * -- Ordering by ID ASC is required to ensure that the 
   * -- system always returns the "latest" information for a specific day,
   * -- if information of one day is included in several original Withings API requests
   * -- (e.g. because data was updated again at a later point in time)
   */

    let rawActivityRequests = await WithingsRawRequest.query().where({
      user_id: userId,
      request_type: "getactivity"
    }).whereRaw('response NOT LIKE \'%"activities":[]%\'').orderBy('request_timestamp', 'ASC');

    // Object for the extracted data across all results
    let allDays = {};
  
    // Iterate over DB result items (actual database table entries)
    for (let rawActivityRequest of rawActivityRequests) {
  
      // Parse JSON stored in "response" database column
      let responseData;
      try {
        responseData = JSON.parse(rawActivityRequest.response);
      }
      catch(err) {
        continue;
      }
  
      // Make sure the response actually included a "activities" key
      if (responseData.activities !== undefined) {
  
        // Iterate through the actual activityDays included in the Withings request
        // "Newer" data for a specific day (specified by key) will automatically
        // be overwritten, that is why the order of the DB request matters
        for (let activityDay of responseData.activities) {
          allDays[activityDay.date] = activityDay;
        }
      }
    }

    // As a last step, sort the array
    allDays = sortObjectByKeys(allDays);
  
    // Only sample data so far
    return allDays;
  }

  /**
   * Get sleeo data stored in the database for a specific user
   * Uses data that is stored in the local database, does NOT perform any API requests to Withings
   * Withings endpoint: getsummary
   * 
   * @param {*} userId 
   * @returns object Activity information, stored in the form of {date => {data},...}
   */
  static async getSleepDataFromDatabase(userId) {

      /**
       * Informations about this request:
       * - whereRaw NOT LIKE activities:[] 
       * -- Ensures that we only pick "non-empty" activity responses
       * - orderBy ID ASC
       * -- Ordering by ID ASC is required to ensure that the 
       * -- system always returns the "latest" information for a specific day,
       * -- if information of one day is included in several original Withings API requests
       * -- (e.g. because data was updated again at a later point in time)
       */
    
        let rawSleepRequests = await WithingsRawRequest.query().where({
          user_id: userId,
          request_type: "getsummary"
        }).whereRaw('response NOT LIKE \'%"series":[]%\'').orderBy('request_timestamp', 'ASC');
    
        // Object for the extracted data across all results
        let allDays = {};
      
        // Iterate over DB result items (actual database table entries)
        for (let rawSleepRequest of rawSleepRequests) {
      
          // Parse JSON stored in "response" database column
          let responseData;
          try {
            responseData = JSON.parse(rawSleepRequest.response);
          }
          catch(err) {
            continue;
          }
      
          // Make sure the response actually included a "activities" key
          if (responseData.series !== undefined) {
      
            // Iterate through the actual activityDays included in the Withings request
            // "Newer" data for a specific day (specified by key) will automatically
            // be overwritten, that is why the order of the DB request matters
            for (let sleepDay of responseData.series) {
              if (sleepDay.data !== undefined) {
                allDays[sleepDay.date] = sleepDay.data;
              }
            }
          }
        }

        // As a last step, sort the array
        allDays = sortObjectByKeys(allDays);

      
        // Only sample data so far
        return allDays;
    }

  /**
   * Get measurement (getmeas) data stored in the database for a specific user
   * Uses data that is stored in the local database, does NOT perform any API requests to Withings
   * Withings endpoint: getmeas
   * 
   * @param {*} userId 
   * @returns object measurements, stored in the form of datetime => [{data},...]
   */
  static async getMeasurementDataFromDatabase(userId) {


    // This really has to be improved/overthought due to the large variance of getmeas requests

    /**
     * Informations about this request:
     * - whereRaw NOT LIKE activities:[] 
     * -- Ensures that we only pick "non-empty" activity responses
     * - orderBy ID ASC
     * -- Ordering by ID ASC is required to ensure that the 
     * -- system always returns the "latest" information for a specific day,
     * -- if information of one day is included in several original Withings API requests
     * -- (e.g. because data was updated again at a later point in time)
     */
      
    let rawMeasRequests = await WithingsRawRequest.query().where({
      user_id: userId,
      request_type: "getmeas"
    }).whereRaw('response NOT LIKE \'%"measuregrps":[]%\'').orderBy('request_timestamp', 'ASC');


    // Object for the extracted data
    // Will contain the following data structure:
    // {2021-05-03 12:00:00 => [{measurement 1}, {measurement 2}, ...], nextTimesatmp => [{meas 1}, ...]}
    let allDatetimes = {};
  
    // Iterate over DB result items (actual database table entries)
    for (let rawMeasRequest of rawMeasRequests) {
  
      // Parse JSON stored in "response" database column
      let responseData;
      try {
        responseData = JSON.parse(rawMeasRequest.response);
      }
      catch(err) {
        continue;
      }
  
      // Make sure the response actually included a "measuregrps" key
      if (responseData.measuregrps !== undefined) {
        for (let measuregrp of responseData.measuregrps) {

          if (measuregrp.date !== undefined && measuregrp.measures !== undefined) {
            // Convert unix timestamp to ISO String date
            let datetime = new Date((measuregrp.date * 1000)).toISOString();
            // let datetime = (measuregrp.date * 1000);
            
            if(allDatetimes[datetime] === undefined) {
              allDatetimes[datetime] = new Array();
            }

            // Iterate through the actual activityDays included in the Withings request
            // "Newer" data for a specific day (specified by key) will automatically
            // be overwritten, that is why the order of the DB request matters
            for (let measureData of measuregrp.measures) {
              allDatetimes[datetime].push(measureData);
            }
          }
        }
      }
    }

    return allDatetimes;
  }

  /**
   * Get get sleep detail data (get) data stored in the database for a specific user
   * Uses data that is stored in the local database, does NOT perform any API requests to Withings
   * Withings endpoint: get
   * 
   * @param {*} userId 
   * @returns object measurements, stored in the form of datetime => [{data},...]
   */
    static async getSleepDetailDataFromDatabase(userId) {
        
    /**
     * Informations about this request:
     * - orderBy ID ASC
     * -- Ordering by ID ASC is required to ensure that the 
     * -- system always returns the "latest" information for a specific day,
     * -- if information of one day is included in several original Withings API requests
     * -- (e.g. because data was updated again at a later point in time)
     */
      
    let rawMeasRequests = await WithingsRawRequest.query().where({
      user_id: userId,
      request_type: "get"
    }).orderBy('request_timestamp', 'ASC');

    // Object for the extracted data
    // Will contain the following data structure:
    // series: [{"startdate": "...",...}, {"startdate": "...", ...},...]
    let allDatetimes = {};
  
    // Iterate over DB result items (actual database table entries)
    for (let rawMeasRequest of rawMeasRequests) {
  
      // Parse JSON stored in "response" database column
      let responseData;
      try {
        responseData = JSON.parse(rawMeasRequest.response);
      }
      catch(err) {
        continue;
      }
  
      // Make sure the response actually included a "measuregrps" key
      if (responseData.series) {
        for (let sleepDetails of responseData.series) {

          if (sleepDetails.startdate) {
            // Convert unix timestamp to ISO String date
            let datetime = new Date((sleepDetails.startdate * 1000)).toISOString();
            // let datetime = (measuregrp.date * 1000);
            
            if(allDatetimes[datetime] === undefined) {
              allDatetimes[datetime] = new Array();
            }

            allDatetimes[datetime] = sleepDetails;
          }
        }
      }
    }

    return allDatetimes;
  }
  

  // getintradday
    /**
   * Get intraday activity data (intradayactivity) data stored in the database for a specific user
   * Uses data that is stored in the local database, does NOT perform any API requests to Withings
   * Withings endpoint: intradayactivity
   * 
   * @param {*} userId 
   * @returns object measurements, stored in the form of datetime => [{data},...]
   */
     static async getIntradayActivityDataFromDatabase(userId) {
        
      /**
       * Informations about this request:
       * - orderBy ID ASC
       * -- Ordering by ID ASC is required to ensure that the 
       * -- system always returns the "latest" information for a specific day,
       * -- if information of one day is included in several original Withings API requests
       * -- (e.g. because data was updated again at a later point in time)
       */
        
      let rawMeasRequests = await WithingsRawRequest.query().where({
        user_id: userId,
        request_type: "getintradayactivity"
      }).orderBy('request_timestamp', 'ASC');
  
      // Object for the extracted data
      // Will contain the following data structure:
      // series: [{"startdate": "...",...}, {"startdate": "...", ...},...]
      let allDatetimes = {};
    
      // Iterate over DB result items (actual database table entries)
      for (let rawMeasRequest of rawMeasRequests) {
    
        // Parse JSON stored in "response" database column
        let responseData;
        try {
          responseData = JSON.parse(rawMeasRequest.response);
        }
        catch(err) {
          continue;
        }

        // Make sure the response actually included a "series" key
        if (responseData.series) {
          for (let timestampKey in responseData.series) {
              // Convert unix timestamp to ISO String date
              let datetime = new Date((timestampKey * 1000)).toISOString();
              
              if(allDatetimes[datetime] === undefined) {
                allDatetimes[datetime] = new Array();
              }
  
              allDatetimes[datetime] = responseData.series[timestampKey];
          }
        }
      }
      return allDatetimes;

    }  

  /**
   * Get workout data stored in the database for a specific user
   * Uses data that is stored in the local database, does NOT perform any API requests to Withings
   * Withings endpoint: getworkouts
   * 
   * @param {*} userId 
   * @returns object Workout information, stored in the form of {datetime => {data},...}
   */
  static async getWorkoutsDataFromDatabase(userId) {

    /**
     * Informations about this request:
     * - whereRaw NOT LIKE activities:[] 
     * -- Ensures that we only pick "non-empty" activity responses
     * - orderBy ID ASC
     * -- Ordering by ID ASC is required to ensure that the 
     * -- system always returns the "latest" information for a specific day,
     * -- if information of one day is included in several original Withings API requests
     * -- (e.g. because data was updated again at a later point in time)
     */
  
      let rawWorkoutRequests = await WithingsRawRequest.query().where({
        user_id: userId,
        request_type: "getworkouts"
      }).whereRaw('response NOT LIKE \'%"series":[]%\'').orderBy('request_timestamp', 'ASC');
  
      // Object for the extracted data across all results
      let allDays = {};
    
      // Iterate over DB result items (actual database table entries)
      for (let rawWorkoutRequest of rawWorkoutRequests) {
    
        // Parse JSON stored in "response" database column
        let responseData;
        try {
          responseData = JSON.parse(rawWorkoutRequest.response);
        }
        catch(err) {
          continue;
        }

        // Make sure the response actually included a "series" key
        if (responseData.series) {
    
          // Iterate through the actual activityDays included in the Withings request
          // "Newer" data for a specific day (specified by key) will automatically
          // be overwritten, that is why the order of the DB request matters
          for (let workout of responseData.series) {
            let datetime = new Date((workout.startdate * 1000)).toISOString();
            allDays[datetime] = workout;
          }
        }
      }
  
      // As a last step, sort the array
      allDays = sortObjectByKeys(allDays);
    
      return allDays;
    }
  

  // getworkouts
      
}

module.exports = WithingsDataHub;
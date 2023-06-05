const express = require('express');
const router = express.Router();

const WithingsDataHub = require('../../services/WithingsDataHub');

const authentication = require('../../source/Authentication');
const { datetimeKeysToDateKeys } = require('../../source/Utils');

const moment = require('moment');


/**
 * Note: It is very debateable whether the backend should process all the data
 * or whether this is the job of the frontend. Both approaches have 
 * up and downsides, so we focuse on a mixed approach here.
 */

/**
 * Summary (Getactivity)
 */

  router.get('/', [authentication.authenticateToken, authentication.authenticateAdmin], async function(req, res, next) {
    try {
      let selectedUserId = req.query.selectedUserId;

      if (!selectedUserId) {
        return res.status(400).send("Respective parameters must be set."); 
      }
  
      let activityData = await WithingsDataHub.getActivityDataFromDatabase(selectedUserId);
      let activityDetailData = await WithingsDataHub.getIntradayActivityDataFromDatabase(selectedUserId);
      let sleepData = await WithingsDataHub.getSleepDataFromDatabase(selectedUserId);
      let sleepDetailData = await WithingsDataHub.getSleepDetailDataFromDatabase(selectedUserId);
      let measData = await WithingsDataHub.getMeasurementDataFromDatabase(selectedUserId);
      let workoutData = await WithingsDataHub.getWorkoutsDataFromDatabase(selectedUserId);

      // Make sure all arrays use dates as key
      activityDetailData = datetimeKeysToDateKeys(activityDetailData);
      measData = datetimeKeysToDateKeys(measData)
      sleepDetailData = datetimeKeysToDateKeys(sleepDetailData)
      workoutData = datetimeKeysToDateKeys(workoutData);

      // Get lowest/earliest date
      // Note: All of the previously returned arrays below are sorted from earliest date to latest date

      let startArrayToSort = [
        Object.keys(activityData)[0],
        Object.keys(activityDetailData)[0],
        Object.keys(sleepData)[0],
        Object.keys(sleepDetailData)[0],
        Object.keys(measData)[0],
        Object.keys(workoutData)[0]
      ]

      let firstDate = startArrayToSort.sort()[0]

      // Get last/latest date
      let endArrayToSort = [
        Object.keys(activityData)[Object.keys(activityData).length-1],
        Object.keys(activityDetailData)[Object.keys(activityDetailData).length-1],
        Object.keys(sleepData)[Object.keys(sleepData).length-1],
        Object.keys(sleepDetailData)[Object.keys(sleepDetailData).length-1],
        Object.keys(measData)[Object.keys(measData).length-1],
        Object.keys(workoutData)[Object.keys(workoutData).length-1]
      ]

      let lastDate = endArrayToSort.sort()[endArrayToSort.sort().length-1]

      let returnObject = {}

      // Iterate from lowest to highest and create data structure
      for (var m = moment(firstDate); m.diff(moment(lastDate), 'days') <= 0; m.add(1, 'days')) {
        let currentDateString = m.format('YYYY-MM-DD');

        returnObject[currentDateString] = {};

        if(activityData[currentDateString]) {
          returnObject[currentDateString]['activityData'] = activityData[currentDateString];
        }

        if(activityDetailData[currentDateString]) {
          returnObject[currentDateString]['activityDetailData'] = activityDetailData[currentDateString];
        }

        if(sleepData[currentDateString]) {
          returnObject[currentDateString]['sleepData'] = sleepData[currentDateString];
        }

        if(sleepDetailData[currentDateString]) {
          returnObject[currentDateString]['sleepDetailData'] = sleepDetailData[currentDateString];
        }


        if(measData[currentDateString]) {
          returnObject[currentDateString]['measData'] = measData[currentDateString];
        }

        if(workoutData[currentDateString]) {
          returnObject[currentDateString]['workoutData'] = workoutData[currentDateString];
        }
      }

      return res.json(returnObject);
    }
    catch(err) {
      // Use Express default error handler
      return next(err)
    }
  });

module.exports = router;

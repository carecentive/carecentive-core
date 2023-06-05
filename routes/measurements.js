const express = require('express');
const router = express.Router();

const WithingsDataHub = require('../services/WithingsDataHub');

const authentication = require('../source/Authentication')

/**
 * Note: It is very debateable whether the backend should process all the data
 * or whether this is the job of the frontend. Both approaches have 
 * up and downsides, so we focuse on a mixed approach here.
 */

/**
 * Summary (Getactivity)
 */

  router.get('/summary/all', authentication.authenticateToken, async function(req, res, next) {
    try {
      userId = req.authData.user_id;

      let activityData = await WithingsDataHub.getActivityDataFromDatabase(userId);

      return res.json(activityData);
    }
    catch(err) {
      // Use Express default error handler
      return next(err)
    }
  });

  /**
   * Sleep (Getsummary)
   */

   router.get('/sleep', authentication.authenticateToken, async function(req, res, next) {
    try {
      userId = req.authData.user_id;

      let sleepData = await WithingsDataHub.getSleepDataFromDatabase(userId);

      return res.json(sleepData);
    }
    catch(err) {
      // Use Express default error handler
      return next(err)
    }
  });

  /**
   * Measurements (getmeas)
   */

   router.get('/measurements', authentication.authenticateToken, async function(req, res, next) {
    try {
      userId = req.authData.user_id;

      let measData = await WithingsDataHub.getMeasurementDataFromDatabase(userId);

      return res.json(measData);
    }
    catch(err) {
      // Use Express default error handler
      return next(err)
    }
  });

  /**
   * Blood pressure
   */

   router.get('/blood-pressure', authentication.authenticateToken, async function(req, res, next) {
    try {
      userId = req.authData.user_id;

      let measData = await WithingsDataHub.getMeasurementDataFromDatabase(userId);

      // Systolic BP is type "10"
      // Diastolic BP is type "9"

      let bloodPressureMeasurements = {
        datetime: new Array(),
        systolic: new Object(),
        diastolic: new Object()
      };

      // Iterate through individual measurement datetimes
      for (let datetime in measData) {

        // Check if the object contains both a systolic and diastolic BP measurement
        let stringifiedMeasurements = JSON.stringify(measData[datetime]);

        // Make sure that both a systolic and diastolic entry is included in the array
        if (stringifiedMeasurements.includes('"type":9') && stringifiedMeasurements.includes('"type":10')) {

          // Add key to datetime list
          // bloodPressureMeasurements.datetime.push(datetime);

          // Actually add the values to the output array
          // TODO: Make sure that the arrays are of equal length by the end of the day
          for (let meas of measData[datetime]) {
            if(meas.type !== undefined && meas.value !== undefined) {
              if(meas.type === 10) {
                // bloodPressureMeasurements.systolic.push(meas.value);
                bloodPressureMeasurements.systolic[datetime] = meas.value;
              }
              else if(meas.type === 9) {
                bloodPressureMeasurements.diastolic[datetime] = meas.value;
              }
            }
          }
        }
      }
      
      return res.json(bloodPressureMeasurements);
    }
    catch(err) {
      // Use Express default error handler
      return next(err)
    }
  });



  /**
   * Heart rate
   */

 /* router.get('/summary/heart', authentication.authenticateToken, async function(req, res, next) {
  try {
    userId = req.authData.user_id;

    let activityData = await WithingsDataHub.getActivityDataFromDatabase(userId);

    let heartRatePerDay = {};
    
    for (let day in activityData) {
      heartratePerDay[day] = activityData[day].hr_average;
    }

    return res.json(activityData);
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});*/


/**
 * Steps
 */

/**
 * Sleep duration
 */

/**
 * Weight
 */


module.exports = router;

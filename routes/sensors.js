const express = require('express');
const router = express.Router();

const SensorDataService = require('../services/SensorDataService')

/**
 * Post data
 * TODO: As of now, this allows the upload of arbitrary data. Add some kind of security mechanism, such as tokens per user (also consider DDOS attacks).
 */
router.put('/data', async function(req, res, next) {

  // Check if required fields are set
  if (!req.body.sensorIdentifier || req.body.sensorIdentifier.length === 0) {
    return res.status(400).send("Sensor identifier must be provided.");
  }

  if (!req.body.data || req.body.data.length === 0) {
    return res.status(400).send("Sensor data must be provided.");
  }

  SensorDataService.addSensorData(req.body.datetimeReported, req.body.sensorIdentifier, req.body.data, req.body.meta);

  res.sendStatus(200);
});

module.exports = router;

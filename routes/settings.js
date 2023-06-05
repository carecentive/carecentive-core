const express = require('express');
const router = express.Router();

const authentication = require('../source/Authentication')

const Settings = require('../models/Setting');

const SettingsService = require('../services/SettingsService');

/**
 * Get all settings
 */
router.get('/', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    let settings = await SettingsService.getSetting(userId);

    res.json(settings)
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});

/**
 * Get a specific setting
 */

 router.get('/:key', authentication.authenticateToken, async function(req, res, next) {
  try {
    let userId = req.authData.user_id;

    let settings = await SettingsService.getSetting(userId, req.params.key);

    res.json(settings);
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});


/**
 * Update a setting
 */
router.post('/', authentication.authenticateToken, async function(req, res, next) {
  let userId = req.authData.user_id;
  // let nowTimestamp = new Date();

  // Check if required fields are set
  if (!req.body.key || req.body.key.length === 0) {
    return res.status(400).send("Key not set");
  }

  // Check if required fields are set
  if (!req.body.data || req.body.data.length === 0) {
    return res.status(400).send("Data not set");
  }

  await SettingsService.updateOrCreateSetting(userId, req.body.key, req.body.data);

  res.sendStatus(200);
});

module.exports = router;

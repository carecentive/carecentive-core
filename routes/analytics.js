const express = require('express');
const router = express.Router();

const authentication = require('../source/Authentication')

const Analytics = require('../models/Analytics');

/* Add a new questionnaire to the database */
router.post('/', authentication.parseButDoNotAuthenticateToken, async function(req, res, next) {

  let userId;
  if (req.authData) {
    userId = req.authData.user_id;
  }
  
  if (!req.body.type || req.body.type === 0) {
    return res.status(400).send("Analytics request type not set.");
  }

  // Store questionnaire data in database
  await Analytics.query().insert({
    user_id: userId,
    type: req.body.type,
    name: req.body.name,
    details: JSON.stringify(req.body.details)
  });

  res.sendStatus(200);
});

module.exports = router;

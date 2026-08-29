const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authentication = require('../source/Authentication')

const Analytics = require('../models/Analytics');

// This endpoint accepts writes without authentication, so it needs its own
// throttle to limit storage-exhaustion / spam abuse. Keyed by client IP.
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many analytics events, slow down.',
});

/* Record a client-side analytics event */
router.post('/', analyticsLimiter, authentication.parseButDoNotAuthenticateToken, async function (req, res, next) {
  try {
    let userId;
    if (req.authData) {
      userId = req.authData.user_id;
    }

    if (!req.body.type || req.body.type === 0) {
      return res.status(400).send("Analytics request type not set.");
    }

    await Analytics.query().insert({
      user_id: userId,
      type: req.body.type,
      name: req.body.name,
      details: JSON.stringify(req.body.details)
    });

    res.sendStatus(200);
  }
  catch (err) {
    next(err);
  }
});

module.exports = router;

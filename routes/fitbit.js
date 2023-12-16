const express = require('express');
const router = express.Router();
const authentication = require('../source/Authentication');
const FitbitManager = require('../services/fitbit/FitbitManager');

router.get("/", authentication.authenticateToken, async function (req, res, next) {
    try {
        res.send("Welcome to Fitbit!");
    } catch {
        next();
    }
});

router.post("/setup", authentication.authenticateToken, async function (req, res, next) {
    try {
        let userId = req.authData.user_id;
        let authorizationCode = req.body.code;

        await FitbitManager.registerUser(authorizationCode, userId)

        res.status(200).send("Authorization Successful!")
    } catch (err) {
        next(err);
    }
});

module.exports = router;
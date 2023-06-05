const express = require('express');
const router = express.Router();
const WithingsDataHub = require('../services/WithingsDataHub');

const authentication = require('../source/Authentication')

router.post('/setup', authentication.authenticateToken, async function(req, res, next) {

  try {
    let userId = req.authData.user_id;
    let authorizationCode = req.body.code;
  
    await WithingsDataHub.registerUser(authorizationCode, userId)

    return res.status(200).send("Device setup successful.")  
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});

/**
 * Route used to toggle Withings data poll by URL using a previously defined API key
 */
router.get('/poll-withings', async function(req, res, next) {
  
  if (!req.query.apikey) {
    return res.status(400).send("API key must be provided.");
  }

  if (!process.env.APIKEY) {
    return res.status(400).send("API key must be set in order to use external API poll.");
  }

  if (req.query.apikey != process.env.APIKEY) {
    return res.status(401).send("Invalid API key.");
  }

  WithingsDataHub.dataPollBatch();

  res.sendStatus(200);
});



module.exports = router;

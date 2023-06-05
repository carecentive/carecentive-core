var express = require('express');
var router = express.Router();
const WithingsDataHub = require('../services/WithingsDataHub');

router.get('/', async function(req, res, next) {
  /**
   * Pull the authorization code and client_id (participant_id set as state) from the GET parameters
   * The user is redirected from withings back to this script, and the respective data is appended as GET parameters
   */ 

  try {
    let participantId = req.query.state;
    let authorizationCode = req.query.code;
  
    await WithingsDataHub.registerUser(authorizationCode, participantId)
  
    res.render('callback', { title: 'Callback', resp: "T" });  
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});


module.exports = router;

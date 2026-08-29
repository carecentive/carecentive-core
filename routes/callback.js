var express = require('express');
var router = express.Router();
const WithingsDataHub = require('../services/WithingsDataHub');

const authentication = require('../source/Authentication');

router.get('/', authentication.authenticateToken, async function(req, res, next) {
  /**
   * Withings redirects the user's browser back here after consent with `code`
   * (and previously `state`) as query parameters.
   *
   * The account the Withings data is linked to is taken from the authenticated
   * session (JWT cookie), NOT from a caller-supplied `state` value. Trusting
   * `state` here let anyone bind an arbitrary Withings account to any user id.
   */

  try {
    let userId = req.authData.user_id;
    let authorizationCode = req.query.code;

    if (!authorizationCode) {
      return res.status(400).send("Authorization code missing.");
    }

    await WithingsDataHub.registerUser(authorizationCode, userId)

    res.render('callback', { title: 'Callback', resp: "T" });
  }
  catch(err) {
    // Use Express default error handler
    return next(err)
  }
});


module.exports = router;

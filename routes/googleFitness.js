'use strict';

const express = require("express");
const jwt = require("jsonwebtoken");

const GoogleFitnessService = require("../services/FitnessService");
const router = express.Router();
const { google } = require("googleapis");

const authentication = require("@carecentive/carecentive-core/source/Authentication");
const ghelper = require("../source/google");
const { testDateFormat } = require("../source/Utils");

// The OAuth `state` parameter round-trips through Google and the user's browser,
// so it must be integrity-protected. We sign it as a short-lived JWT: the
// callback rejects any state it did not issue, which prevents an attacker from
// choosing the `user_id` the Google tokens get bound to, and from injecting an
// arbitrary post-login redirect target.
const OAUTH_STATE_TTL = "15m";

function signOAuthState(payload) {
  return jwt.sign(payload, process.env.JWT_TOKEN_SECRET, { expiresIn: OAUTH_STATE_TTL });
}

function verifyOAuthState(state) {
  try {
    return jwt.verify(state, process.env.JWT_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
}

// Only redirect back to the configured frontend origin. Anything else (including
// a missing or foreign referer) falls back to FRONTEND_URL so this cannot be
// used as an open redirect.
function resolveSafeRedirect(referer) {
  const base = process.env.FRONTEND_URL || "/";
  if (
    referer &&
    process.env.FRONTEND_URL &&
    referer.startsWith(process.env.FRONTEND_URL)
  ) {
    return referer;
  }
  return base;
}

/*
 * GET /connection
 * Initiate Google Authentication process to gain user permission for offline collection of fitness data
 * Returns a redirect URL for the OAuth consent screen which should be handled on Frontend
 */
router.get(
  "/connection",
  authentication.authenticateToken,
  async function (req, res, next) {
    const userId = req.authData.user_id;
    const user = await GoogleFitnessService.getUser(userId);
    if (user) {
      res.status(400).send({
        message: "Google Fit Access already provided.",
      });
    } else {
      const referer = req.get("referer"); //To retain the origin of API call after redirection from Google Auth Server
      const authorizationUrl = ghelper.oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ghelper.scopes,
        include_granted_scopes: true,
        // Signed so the callback can trust userId/referer it gets back.
        state: signOAuthState({ userId: userId, referer: referer }),
      });
      res.send({ url: authorizationUrl });
    }
  }
);

/*
 * GET /auth-callback
 * (endpoint should match Authorized Redirect URL on Google Console)
 * Auto-redirects from Google's OAuth Consent Screen after providing permissions
 * On return, frontend is redirected to the page that initiated google authentication
 */
router.get("/auth-callback", async function (req, res, next) {
  try {
    const { code, state } = req.query;

    const userState = verifyOAuthState(state);
    if (!userState || !userState.userId) {
      return res.status(400).send("Invalid or expired OAuth state.");
    }

    if (!code) {
      return res.status(400).send("Authorization code missing.");
    }

    const { tokens } = await ghelper.oauth2Client.getToken(code);
    const ticket = await ghelper.oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: ghelper.auth.clientId,
    });

    if (!ticket.payload) {
      return res.status(400).send("Could not verify Google identity.");
    }

    let newUser = {
      user_id: userState.userId,
      email: ticket.payload["email"],
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token,
    };
    await GoogleFitnessService.addUser(newUser);

    res.writeHead(301, { Location: resolveSafeRedirect(userState.referer) }).end();
  } catch (err) {
    next(err);
  }
});

/*
 * GET /
 * To check if User has already connected Fitness API to our system
 */
router.get(
  "/",
  authentication.authenticateToken,
  async function (req, res, next) {
    try {
      const userId = req.authData.user_id;
      const googleUser = await GoogleFitnessService.getUser(userId);
      res.send({
        connected: googleUser && googleUser.access_token ? true : false,
      });
    } catch (err) {
      next(err);
    }
  }
);

/*
 * DELETE /disconnect
 * Removes user permission to access fitness data from Google
 * Deletes google tokens for user but Retains old synced fitness data for user
 */
router.delete(
  "/disconnect",
  authentication.authenticateToken,
  async function (req, res, next) {
    try {
      const userId = req.authData.user_id;
      await GoogleFitnessService.removeUser(userId);
      return res.status(200).send({ message: "Google Fit Disconnected" });
    } catch (err) {
      next(err);
    }
  }
);

/*
 * GET /sync?fromDate=YYYY-MM-DD
 * (Allowed only for users that have given permission for fitness API)
 * Initiates collection of fitness data from last fetched date or one day before to current date
 * if fromDate param is provided, data will be fetched from that date to current date,
 * given fromDate is not greater than current date, else follows the default behavior
 */
router.get(
  "/sync",
  authentication.authenticateToken,
  async function (req, res, next) {
    try {
      const { fromDate } = req.query;
      if (fromDate && !testDateFormat(fromDate)) {
        return res.status(400).json({
          error: "Please provide from Date (YYYY-MM-DD).",
        });
      }
      const userId = req.authData.user_id;
      const googleUser = await GoogleFitnessService.getUser(userId);
      if (googleUser) {
        const data = await GoogleFitnessService.syncData(googleUser, fromDate);
        res.send(data);
      } else {
        res.status(404).send({
          message: "No access to google fit provided",
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

/*
 * GET /data-types
 * Returns list of fitness data types stored in our database
 * To be used for filtering purposes on the frontend
 */
router.get(
  "/data-types",
  authentication.authenticateToken,
  async function (req, res, next) {
    try {
      const userId = req.authData.user_id;
      const googleUser = await GoogleFitnessService.getUser(userId);
      if (googleUser) {
        const data = await GoogleFitnessService.fetchDatatypes(userId);
        res.send({ datatypes: data });
      } else {
        res.status(404).send({
          message: "No access to google fit provided",
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

/*
 * GET /data?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&dataTypes=<data-types>
 * (<data-types> : string of data types separated by comma)
 * Returns user fitness data from our database based on query
 */
router.get(
  "/data",
  authentication.authenticateToken,
  async function (req, res, next) {
    try {
      const { fromDate, toDate, dataTypes } = req.query;
      if (!testDateFormat(fromDate) || !testDateFormat(toDate)) {
        return res.status(400).json({
          error: "Please provide from Date and to Date (YYYY-MM-DD).",
        });
      }

      const dataTypesArray = dataTypes ? dataTypes.split(",") : [];
      const userId = req.authData.user_id;
      let result = await GoogleFitnessService.fetchData(
        userId,
        fromDate,
        toDate,
        dataTypesArray
      );
      res.send(result);
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;

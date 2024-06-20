const jwt = require('jsonwebtoken')
const User = require('../models/User');
const ThirdPartyToken = require("../models/ThirdPartyToken");
const Errors = require("../source/Errors");
const withErrorHandler = require("./errorHandler");

/**
 * Express Middleware for token authentication
 */
function authenticateToken(req, res, next) {
    return withErrorHandler(async function(req, res, next) {
        const token = req.cookies.token;

        if(! token) {
            throw new Errors.AuthenticationMissingError("Authentication Bearer token missing from request");
        }

        jwt.verify(token, process.env.JWT_TOKEN_SECRET, (err, authData) => {
            if (err) {
                throw new Errors.AuthorizationError("Authentication token is invalid");
            }

            req.authData = authData;
            req.authData['thirdParty'] = false;
            next();
        });
    })(req, res, next);
}

function parseButDoNotAuthenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (token) {
      jwt.verify(token, process.env.JWT_TOKEN_SECRET, (err, authData) => {
        if (err) {
          req.authData = false;
        }
        else {
          req.authData = authData;
        }

        next();
      });
  } else {
      req.authData = undefined;
      next();
  }
}

async function authenticateAdmin(req, res, next) {
    return withErrorHandler(async function(req, res, next) {
      if(! req.authData) {
          throw new Errors.AuthenticationMissingError("Authentication Bearer token missing from request");
      }

      let userId = req.authData.user_id;
      let user = await User.query().findById(userId).withGraphFetched('roles');

      if ( user.roles.some((role) => role.name === "admin") ) {
        next();
      } else {
          throw new Errors.AuthorizationError("Administrator privileges are required to access this resource");
      }
    })(req, res, next);
}

/**
 * Express Middleware for authentication using the third party token
 * Falls back to user token authentication
 */
function authenticateThirdPartyOrToken(req, res, next) {
    return withErrorHandler(async function(req, res, next) {
        const authHeader = req.headers.authorization;

        if (! authHeader) {
            throw new Errors.AuthenticationMissingError("Authentication Bearer token missing from request");
        }

        const token = String(authHeader).replace(/^Bearer /g, '');

        /**
         * @type {ThirdPartyToken | undefined}
         */
        const storedToken = await ThirdPartyToken.query().where('access_token', token).first();

        if (! storedToken) {
            return authenticateToken(req, res, next);
        }

        if (! storedToken.active) {
            throw new Errors.AuthenticationError("The authentication token is not active");
        }

        if (storedToken.valid_till && storedToken.valid_till < Date.now()) {
            throw new Errors.AuthenticationError("The authentication token is expired");
        }

        req.authData = {thirdParty: true};
        next();
    })(req, res, next);
}

module.exports = {authenticateToken, parseButDoNotAuthenticateToken, authenticateAdmin, authenticateThirdPartyOrToken}

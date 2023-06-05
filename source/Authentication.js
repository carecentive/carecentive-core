const jwt = require('jsonwebtoken')
const User = require('../models/User');


/**
 * Express Middleware for token authentication
 */

function authenticateToken(req, res, next) {
  // const authHeader = req.headers.authorization;

  token = req.cookies.token

  if (token) {
      jwt.verify(token, process.env.JWT_TOKEN_SECRET, (err, authData) => {
          if (err) {
              return res.sendStatus(403);
          }

          req.authData = authData;
          next();
      });
  } else {
      res.sendStatus(401);
  }
};

function parseButDoNotAuthenticateToken(req, res, next) {
  token = req.cookies.token

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
};  

async function authenticateAdmin(req, res, next) {

  if(!req.authData) {
    return res.sendStatus(401);
  }

  let userId = req.authData.user_id;
  let user = await User.query().findById(userId);

  if ( user.role && user.role === 'admin' ) {
    next();
  }
  else {
    return res.sendStatus(401);
  }
};

module.exports = {authenticateToken, parseButDoNotAuthenticateToken, authenticateAdmin}
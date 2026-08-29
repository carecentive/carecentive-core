'use strict';

const jwt = require('jsonwebtoken')
const User = require('../models/User');

// Pin the accepted signature algorithm. The token secret is a symmetric string,
// so only HS256 is ever valid; accepting whatever the token header asks for is
// what enables algorithm-confusion attacks.
const JWT_VERIFY_OPTIONS = { algorithms: ['HS256'] };

/**
 * Express Middleware for token authentication
 */

function authenticateToken(req, res, next) {
  // const authHeader = req.headers.authorization;

  const token = req.cookies.token

  if (token) {
      jwt.verify(token, process.env.JWT_TOKEN_SECRET, JWT_VERIFY_OPTIONS, (err, authData) => {
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
  const token = req.cookies.token

  if (token) {
      jwt.verify(token, process.env.JWT_TOKEN_SECRET, JWT_VERIFY_OPTIONS, (err, authData) => {
        // On an invalid/expired token, behave exactly as if no token was sent
        // so downstream handlers only need a single "is authData set?" check.
        req.authData = err ? undefined : authData;

        next();
      });
  } else {
      req.authData = undefined;
      next();
  }
};

async function authenticateAdmin(req, res, next) {
  try {
    if (!req.authData || !req.authData.user_id) {
      return res.sendStatus(401);
    }

    const user = await User.query().findById(req.authData.user_id);

    // 401: the token references a user that no longer exists.
    if (!user) {
      return res.sendStatus(401);
    }

    // Admin status is modelled as an entry in the users <-> roles N:M relation
    // (join table user_roles), not as a column on the user row.
    const adminRoles = await user
      .$relatedQuery('roles')
      .where('name', 'admin')
      .limit(1);

    if (adminRoles.length > 0) {
      return next();
    }

    // Authenticated, but not an administrator.
    return res.sendStatus(403);
  }
  catch (err) {
    return next(err);
  }
};

module.exports = {authenticateToken, parseButDoNotAuthenticateToken, authenticateAdmin}
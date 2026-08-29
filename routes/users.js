const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const authentication = require('../source/Authentication')

const UserService = require('../services/UserService');

const User = require('../models/User');

// Throttle unauthenticated credential endpoints to slow down brute-force and
// enumeration attempts. Keyed by client IP (requires `app.set('trust proxy', ...)`
// to be configured correctly when running behind a reverse proxy).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts, please try again later.',
});

// Auth cookie hardening: not readable from JS (httpOnly), only sent over HTTPS
// in production (secure), and not sent on cross-site requests (sameSite) which
// blocks CSRF against the cookie-authenticated API.
const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

router.post('/register', authLimiter, async function(req, res, next) {
  try {

    if(!req.body.name) {
      return res.status(400).send("NAME_MUST_BE_PROVIDED.");
    }

    if(!req.body.email) {
      return res.status(400).send("EMAIL_MUST_BE_PROVIDED.");
    }

    if(!req.body.password) {
      return res.status(400).send("PASSWORD_MUST_BE_PROVIDED.");
    }

    await UserService.register(req.body.name, req.body.email, req.body.password);

    res.sendStatus(200);
  }
  catch (err) {
    // Do not disclose whether the account already exists. Respond as if the
    // registration succeeded; the duplicate is silently not created.
    if (err.message === "USER_ALREADY_EXISTS") {
      return res.sendStatus(200);
    }
    next(err)
  }
});

router.post('/login', authLimiter, async function(req, res, next) {
  try {

    let username = req.body.username
    let password = req.body.password

    if(!username) {
      return res.status(400).send("USERNAME_NOT_PROVIDED.");
    }

    if(!password) {
      return res.status(400).send("PASSWORD_NOT_PROVIDED.");
    }

    let token = await UserService.login(username, password)

    res.cookie('token', token, TOKEN_COOKIE_OPTIONS);
    return res.json(token);
  }
  catch (err) {
    if(err.message === "INVALID_NAME_OR_PASSWORD") {
      return res.status(401).send("INVALID_NAME_OR_PASSWORD");
    }
    next(err)
  }
});

router.get('/logout', async function(req, res, next) {
  try {
    // Clearing a cookie only works when the attributes match the ones it was set with.
    res.clearCookie('token', { ...TOKEN_COOKIE_OPTIONS, maxAge: undefined });
    res.end();
  }
  catch (err) {
    next(err)
  }
});

router.post('/changePassword', authentication.authenticateToken, async function(req, res, next) {
  
  try {
    let userId = req.authData.user_id;

    if (!req.body.newPassword || req.body.newPassword === 0) {
      return res.status(400).send("NEW_PASSWORD_NOT_PROVIDED");
    }

    UserService.changePassword(userId, req.body.newPassword);

    // Hash password
    let newPasswordHash = await bcrypt.hash(req.body.newPassword, 12)

    await User.query().patch({
      password_hash: newPasswordHash
    }).findById(userId);

    res.sendStatus(200);
  }
  catch (err) {
    next(err)
  }
});

module.exports = router;
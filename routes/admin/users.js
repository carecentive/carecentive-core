const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const authentication = require('../../source/Authentication')

const User = require('../../models/User');

router.get('/', [authentication.authenticateToken, authentication.authenticateAdmin], async function(req, res, next) {
  try {
    let users = await User.query().select('id', 'pseudonym', 'role', 'created_at')
    return res.json(users);
  }
  catch (err) {
    next(err)
  }
});

router.post('/:userId/changePassword', [authentication.authenticateToken, authentication.authenticateAdmin], async function(req, res, next) {
  
  try {
    let userId = req.params.userId;

    if (!userId || userId === 0) {
      return res.status(400).send("User ID must be provided.");
    }

    if (!req.body.newPassword || req.body.newPassword === 0) {
      return res.status(400).send("New password must be provided.");
    }

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
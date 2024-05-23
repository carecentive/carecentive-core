// carecentive-core/routes/GarminAuthRoutes.js
const express = require('express');
const router = express.Router();
const { getOAuthRequestToken, getOAuthAccessToken } = require('../services/GarminAuth');

callback_base = process.env.GARMIN_CALLBACK_URL

router.post('/auth/garmin', async (req, res) => {
  const { userID } = req.body;
  try {
    const { token, tokenSecret } = await getOAuthRequestToken(userID);
    req.session.userID = userID;
    req.session.token = token;
    req.session.tokenSecret = tokenSecret;
    res.status(200).json({ redirectUrl: `https://connect.garmin.com/oauthConfirm?oauth_token=${token}` });
  } catch (error) {
    console.error('Error getting OAuth request token:', error);
    res.status(500).json({ error: 'Error getting OAuth request token' });
  }
});

router.get('/auth/garmin/callback', async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  try {
    const userID = req.session.userID;
    if (!userID) {
      throw new Error('User ID not found in session.');
    }
    const accessTokenData = await getOAuthAccessToken(userID, oauth_token, oauth_verifier);
    res.redirect(callback_base);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect(callback_base);
  }
});

module.exports = router;

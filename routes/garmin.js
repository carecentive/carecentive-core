const express = require('express');
const router = express.Router();
const auth = require('../services/GarminAuth')

router.post('/', async function(req,res){
    try {
        let userId = req.authData.user_id;

        const { token, tokenSecret } = await auth.getOAuthRequestToken(userId);
        res.redirect(`https://connect.garmin.com/oauthConfirm?oauth_token=${token}`);
      } catch (error) {
        console.error('Error getting OAuth request token:', error);
        res.status(500).json({ error: 'Error getting OAuth request token' });
      }
});

router.get('/callback', async (req, res) => {
    let userId = req.authData.user_id;
    const { oauth_token, oauth_verifier } = req.query;
    try {
      const accessTokenData = await auth.getOAuthAccessToken(userId, oauth_token, oauth_verifier);
      return res.status(200).send("Garmin Connect setup successful.")  
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.status(500).json({ error: 'Error in OAuth callback' });
    }
  });


module.exports = router;

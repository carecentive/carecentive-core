const axios = require('axios');
const crypto = require('crypto');
const db = require('./GarminDB');

/**
 * Generates a random nonce value.
 * @returns {string} A random string to be used as a nonce.
 */
const generateNonce = () => crypto.randomBytes(16).toString('hex');

/**
 * Generates the current timestamp.
 * @returns {string} The current timestamp in seconds as a string.
 */
const generateTimestamp = () => Math.floor(Date.now() / 1000).toString();


/**
 * Constructs OAuth parameters required for authentication headers.
 * @param {string} consumerKey - The consumer key provided by the OAuth provider.
 * @param {string} [token=''] - (Optional) The OAuth token if available.
 * @param {string} [verifier=''] - (Optional) The OAuth verifier if available.
 * @returns {Object} An object containing OAuth parameters.
 */
const getOAuthParameters = (consumerKey, token = '', verifier = '') => ({
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: generateTimestamp(),
    oauth_version: '1.0',
    ...(token && { oauth_token: token }),
    ...(verifier && { oauth_verifier: verifier }),
});

/**
 * URL encodes OAuth parameters.
 * @param {Object} parameters - The OAuth parameters to be encoded.
 * @returns {string} A string of URL-encoded parameters.
 */
const encodeParameters = (parameters) =>
    Object.entries(parameters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');


/**
 * Creates a base string for the OAuth signature.
 * @param {string} method - The HTTP method (e.g., 'POST', 'GET').
 * @param {string} url - The request URL.
 * @param {Object} parameters - The OAuth parameters.
 * @returns {string} The signature base string.
 */    
const createBaseString = (method, url, parameters) =>
    `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(encodeParameters(parameters))}`;

/**
 * Signs the OAuth request.
 * @param {string} baseString - The signature base string.
 * @param {string} consumerSecret - The consumer secret provided by the OAuth provider.
 * @param {string} [tokenSecret=''] - (Optional) The OAuth token secret.
 * @returns {string} The generated signature.
 */    
const signRequest = (baseString, consumerSecret, tokenSecret = '') =>
    crypto.createHmac('sha1', `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`)
    .update(baseString)
    .digest('base64');

/**
 * Builds the Authorization header for OAuth.
 * @param {Object} parameters - The OAuth parameters.
 * @param {string} signature - The generated signature.
 * @returns {string} The Authorization header value.
 */    
const buildAuthorizationHeader = (parameters, signature) =>
    `OAuth ${Object.entries(parameters)
        .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
        .join(', ')}, oauth_signature="${encodeURIComponent(signature)}"`;

let globalTokenSecret = ''; // Consider a more secure way to handle this

/**
 * Generates an OAuth request token to initiate the user authorization process.
 * @param {number} userId - The ID of the user initiating the request.
 * @returns {Promise<Object>} A promise that resolves with the OAuth token and secret.
 */
async function getOAuthRequestToken(userID) {
    const { consumerKey, consumerSecret } = await db.GarminDBManager.getConsumerCredentials(userID);
    const parameters = getOAuthParameters(consumerKey);
    const baseString = createBaseString('POST', 'https://connectapi.garmin.com/oauth-service/oauth/request_token', parameters);
    const signature = signRequest(baseString, consumerSecret);

    const response = await axios.post('https://connectapi.garmin.com/oauth-service/oauth/request_token', null, {
        headers: { Authorization: buildAuthorizationHeader(parameters, signature) },
    });

    const { oauth_token, oauth_token_secret } = Object.fromEntries(new URLSearchParams(response.data));
    globalTokenSecret = oauth_token_secret; // Store the token secret to use in the next step
    return { token: oauth_token, tokenSecret: oauth_token_secret };
}

/**
 * Exchanges an OAuth Request Token for an Access Token.
 * @param {number} userID - The user ID for whom to exchange the token.
 * @param {string} oauthToken - The OAuth Request Token.
 * @param {string} oauthVerifier - The OAuth verifier.
 * @returns {Promise<Object>} An object containing the access token and token secret.
 */
async function getOAuthAccessToken(userID, oauthToken, oauthVerifier) {
  const { consumerKey, consumerSecret } = await db.GarminDBManager.getConsumerCredentials();
    const parameters = getOAuthParameters(consumerKey, oauthToken, oauthVerifier);
    const baseString = createBaseString('POST', 'https://connectapi.garmin.com/oauth-service/oauth/access_token', parameters);
    const signature = signRequest(baseString, consumerSecret, globalTokenSecret);

    const response = await axios.post('https://connectapi.garmin.com/oauth-service/oauth/access_token', null, {
        headers: { Authorization: buildAuthorizationHeader(parameters, signature) },
    });
    const accessTokenData = Object.fromEntries(new URLSearchParams(response.data));
    const accessToken = accessTokenData.oauth_token;
    const accessTokenSecret = accessTokenData.oauth_token_secret;
    const garminUserId = await getGarminUserId(userID, accessToken, accessTokenSecret);

    // Save participant user data to the database
    await db.GarminDBManager.saveOrUpdateGarminUser(userID, garminUserId, accessToken, accessTokenSecret);
    return { accessToken: accessToken, accessTokenSecret: accessTokenSecret };
}

/**
 * Exchanges an OAuth Request Token for an Access Token.
 * @param {number} userID - The user ID for whom to exchange the token.
 * @param {string} oauthToken - The OAuth Request Token.
 * @param {string} oauthVerifier - The OAuth verifier.
 * @returns {Promise<Object>} An object containing the access token and token secret.
 */
async function getGarminUserId(userID, accessToken, accessTokenSecret) {
  const url = 'https://apis.garmin.com/wellness-api/rest/user/id';
  const { consumerKey, consumerSecret } = await db.GarminDBManager.getConsumerCredentials();
  const parameters = getOAuthParameters(consumerKey, accessToken);
  const baseString = createBaseString('GET', url, parameters);
  const signature = signRequest(baseString, consumerSecret, accessTokenSecret);

  const response = await axios.get(url, {
      headers: { Authorization: buildAuthorizationHeader(parameters, signature) },
  });

  return response.data.userId; // Assuming the API response includes the userId in this format
}

module.exports = {
    getOAuthRequestToken,
    getOAuthAccessToken,
    getGarminUserId,
};

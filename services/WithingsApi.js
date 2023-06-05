const axios = require('axios');
const FormData = require('form-data');

const { WithingsApiError, HttpError, AuthenticationMissingError } = require('../source/Errors')

class WithingsApi {
  
  static async apiSetup(authorizationCode) {

    // Withings API requires parameters to be transmitted via FormData

    let bodyFormData = new FormData();
    bodyFormData.append("action", "requesttoken");
    bodyFormData.append("client_id", process.env.CLIENT_ID);
    bodyFormData.append("client_secret", process.env.CONSUMER_SECRET);
    bodyFormData.append("grant_type", "authorization_code");
    bodyFormData.append("code", authorizationCode);
    bodyFormData.append("redirect_uri", process.env.WITHINGS_REDIRECT_URI);

    try {
      const response = await axios({
        method: "post",
        url: "https://wbsapi.withings.net/v2/oauth2", 
        data: bodyFormData,
        headers: bodyFormData.getHeaders()
      })

      if(response.data.status == 0) {
        let withingsUserId = response.data.body.userid
        let accessToken = response.data.body.access_token
        let refreshToken = response.data.body.refresh_token
        let scope = response.data.scope
        let expiresIn = response.data.body.expires_in

        return [withingsUserId, accessToken, refreshToken, scope, expiresIn]
      }
      else {
        throw new WithingsApiError(response.data.status + " (" + response.data.error + ")")
      }
    } catch (err) {
      // Propagate error to next error handler, as error handling is done in either middleware or route controller
      throw err
    }
  }

  static async refreshToken(currentRefreshToken) {    
    let bodyFormData = new FormData();
    bodyFormData.append("action", "requesttoken");
    bodyFormData.append("client_id", process.env.CLIENT_ID);
    bodyFormData.append("client_secret", process.env.CONSUMER_SECRET);
    bodyFormData.append("grant_type", "refresh_token");
    bodyFormData.append("refresh_token", currentRefreshToken);

    try {
      const response = await axios({
        method: "post",
        url: "https://wbsapi.withings.net/v2/oauth2", 
        data: bodyFormData,
        headers: bodyFormData.getHeaders()
      })

      if(response.data.status == 0) {
        let withingsUserId = response.data.body.userid
        let accessToken = response.data.body.access_token
        let refreshToken = response.data.body.refresh_token
        let scope = response.data.scope
        let expiresIn = response.data.body.expires_in

        return [withingsUserId, accessToken, refreshToken, scope, expiresIn]
      }
      else {
        throw new WithingsApiError(response.data.status + " (" + response.data.error + ")")
      }
    } catch (err) {
      // Propagate error to next error handler, as error handling is done in either middleware or route controller
      throw err
    }
  }

  /**
   * Generic wrapper class to perform a "raw" API request to the Withings API.
   * 
   * @param {String} token Access token (Bearer) for Withings API
   * @param {URL} endpointUrl Endpoint URL according to Withings API documentation
   * @param {String} action Action name according to Withings API documentation
   * @param {Object} requestParameters Remaining request parameters according to Withings API documentation
   * @returns 
   */
  static async apiRequest(token, endpointUrl, action, requestParameters) {
    if(!token) {
      throw new AuthenticationMissingError("Withings Bearer not set.")
    }

    if(!endpointUrl) {
      throw new Error("API endpoint URL must be specified.")
    }

    if(!action) {
      throw new Error("API action must be specified.")
    }

    let bodyFormData = new FormData();
    bodyFormData.append("action", action);

    for (const [key, value] of Object.entries(requestParameters)) {
      bodyFormData.append(key, value);
    }
    
    let headers = bodyFormData.getHeaders()
    headers.Authorization = ("Bearer " + token)

    try {
      const response = await axios({
        method: "post",
        url: endpointUrl, 
        data: bodyFormData,
        headers: headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })

      if(response.data.status != null && response.data.status === 0) {
        return response.data.body
      }
      else {
        throw new WithingsApiError(response);
      }
    } catch (err) {
      // Propagate error to next error handler, as error handling is done in either middleware or route controller
      throw err
    }
  }
}

module.exports = WithingsApi;
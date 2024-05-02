const { google } = require("googleapis");
var dotenv = require("dotenv");
dotenv.config();

// Google Fitness API Credentials
const auth = {
  clientId: process.env.GCLIENT_ID,
  clientSecret: process.env.GCLIENT_SECRET,
  redirectUri: process.env.GREDIRECT_URI,
};

//Google Client Object
const oauth2Client = new google.auth.OAuth2(
  auth.clientId,
  auth.clientSecret,
  auth.redirectUri
);

//Fitness Data scopes
const scopestring =
  "https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.nutrition.read https://www.googleapis.com/auth/fitness.body_temperature.read https://www.googleapis.com/auth/fitness.blood_glucose.read https://www.googleapis.com/auth/fitness.location.read openid https://www.googleapis.com/auth/fitness.sleep.read https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/fitness.reproductive_health.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.oxygen_saturation.read https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.blood_pressure.read https://www.googleapis.com/auth/userinfo.email";

const scopes = [
  "email",
  "https://www.googleapis.com/auth/fitness.activity.read",
  "https://www.googleapis.com/auth/fitness.blood_glucose.read",
  "https://www.googleapis.com/auth/fitness.blood_pressure.read",
  "https://www.googleapis.com/auth/fitness.body.read",
  "https://www.googleapis.com/auth/fitness.body_temperature.read",
  "https://www.googleapis.com/auth/fitness.heart_rate.read",
  "https://www.googleapis.com/auth/fitness.location.read",
  "https://www.googleapis.com/auth/fitness.nutrition.read",
  "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
  "https://www.googleapis.com/auth/fitness.reproductive_health.read",
  "https://www.googleapis.com/auth/fitness.sleep.read",
];

/* 
 * List of strings in data types which can be ignored (to avoid multiple unnecessary calls)
  --The list includes datatypes that require manual input from users in Google Fit app 
    and aggregated datatypes created by Google who are not available through the endpoint used 
    in this implementation
  -- Update the list as seen fit
*/
const ignorables = [
  "active_minutes",
  "cumulative",
  "height",
  "weight",
  "heart_minutes",
  "speed",
  "activity.segment",
  "bmr",
];

/**
 * Returns google client set to specific user
 * @param {object} user // User object with access_token, refresh_token and id_token fields
 * @returns {client object}
 */
function getAuthClient(user) {
  oauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    id_token: user.id_token,
    scope: scopestring,
  });
  return oauth2Client;
}

/**
 * Returns key for specific data types in Fitness data object
 * @param {string} format
 * @returns {string}
 */
function dataFormat(format) {
  switch (format) {
    case "floatPoint":
      return "fpVal";
    case "integer":
      return "intVal";
    case "string":
      return "stringVal";
    default:
      return format;
  }
}

/**
 * Returns Unique set of data types for handling data from Google Fit API
 * @param {array} allSources
 * @returns {array of object}
 */
function filterDatatypes(allSources) {
  if (allSources.length) {
    //Data sources filterd for repetition and avoidable data types (Data manually saved by User in Google Fit or cumulative data that cannot be aggregated over day intervals)
    const uniqueObjects = Array.from(
      allSources.reduce((uniqueSet, currentObject) => {
        const { name, field } = currentObject.dataType;
        const containsIgnorable = ignorables.some((ignorable) =>
          name.includes(ignorable)
        );

        if (!containsIgnorable) {
          const existingObject = uniqueSet.find((obj) => obj.type === name);

          if (!existingObject) {
            uniqueSet.push({
              name: name.split(".")[2],
              type: name,
              format: dataFormat(field[0].format),
            });
          }
        }
        return uniqueSet;
      }, [])
    );
    return uniqueObjects;
  } else {
    return [];
  }
}

module.exports = {
  auth,
  scopestring,
  scopes,
  oauth2Client,
  getAuthClient,
  filterDatatypes,
};

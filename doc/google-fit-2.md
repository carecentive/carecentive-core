# Google Fitness API Integration

Package Used : \`**_googleapis_**\`

## Carecentive-core

Repository: <https://github.com/carecentive/carecentive-core/tree/feature/google-fit>

### Google Authentication Setup

Follow Instructions in \`SetupGoogleAuth.pdf\` to get google app credentials. The google console app in development mode has limitations such as, only user emails added as test user in the google console page, can use the Fitness API integration and tokens are revoked automatically in 10 days time.

The credentials should be saved in the '.**_env_**' file of your backend app with your google console app credentials as GCLIENT_ID, GCLIENT_SECRET and GREDIRECT_URI. For implementation, follow instructions in \`_GOOGLEFIT.md_\` file in \`@carecentive/carecentive-framework\` (<https://github.com/carecentive/carecentive-framework>)

### Database

Two tables \`google_users\` and \`google_data\` with reference to carecentive user's id are used to store the user information and data collected from google fitness respectively.

\- Table \`google_users\` contains \`access_token\` for access to fitness data, \`id_token\` for verification of google user and \`refresh_token\` for renewal of access_token.

\- In table \`google_data\`, \`data\` stores raw data as json, \`format\` contains string to denote type of value in raw data (integer, string, et.al). \`datatype\` and \`value\` stores the type of data and actual value for easy reading. Date associated with the data is stored as integer in Seconds.

###

### Workflow

1\. Initiate Google API authorization flow for User

GET _/connection_

Oauth2Client Object with google app credentials is used to generate an Authorization URL for google login and providing data permissions. The above endpoint returns the authorization URL which should be accessed from the frontend by user. On successful login/permissions, Google will redirect the user to a callback url on the backend which was used during Google Authentication Setup. Only Read Permissions are used for Fitness data. For list of permissions used, see scopes in \`source/google.js\`.

GET _/auth-callback_

This endpoint acquires google access tokens for specific users and verifies the google user. Either a new google user is created with the tokens or if a user already exists, tokens are updated. The link to the original referrer which initiated the authentication process is returned such that the user will be redirected to the original referrer automatically.

Token Refresh is automatically handled using refresh_token when calling Fitness API. The refresh_token is only sent on the first authorization process and cannot be retrieved again unless the user follows the token revoking process through our app or directly from Google.

2\. Collect Fitness Data from Google

GET _/sync?fromDate=2024-03-01_

It checks the last fitness data stored in the database and requests new data from Google Fitness since that point in time. List of data sources for the user is fetched from Google which denotes types of data stored, which is then filtered for repetition and avoidable data types (Data manually saved by User in Google Fit or cumulative data that cannot be aggregated over day intervals, see function \`filterDatatypes\` in file \`source/google.js\`; Update ignorable list as seen fit to access different data types).

Fitness data aggregated over one day interval is fetched for each data type individually and saved in the database. If data for the same day already exists, it is updated. Data is stored in raw format as well.

Param _fromDate_ is optional incase user wants to define the starting date for syncing data. If the param is provided, data will be fetched from that date to current date, given that fromDate is not greater than current date, else it follows the default behavior.

Fitness API Used:

\- Datasource - includes all sources of fitness sensory data with datatype for individual user; It includes information on devices or apps that user permitted to manipulate fitness data.

(<https://developers.google.com/fit/rest/v1/data-sources>)

\- Aggregate Data - It allows you to retrieve aggregated data, such as daily steps or calories burned over a specific time period, in our case (1 day interval) for a range of days. It returns list of buckets for each data type and time period.

(<https://developers.google.com/fit/rest/v1/reference/users/dataset/aggregate>,

<https://developers.google.com/fit/datatypes/aggregate>)

3\. Revoke Google Fit Access for User

GET _/disconnect_

In case, User wants to revoke fitness data permission provided to Carecentive, This endpoint revokes the stored google tokens for the specific user and deletes the token. The data collected for the use before revoking, are retained in the database.

4\. Check if user has provided access to Google Fit

GET /

This endpoint simply checks if the user has provided permissions to use fitness data to Carecentive.

4\. Get list of datatypes that can be used to filter user data

GET _/data-types_

It returns a list of fitness data types stored in our database.

5\. Get list of user data for given date range

GET _/data?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&dataTypes=calories,distance_

It returns a list of fitness data for users in ascending order of dates based on fromDate and toDate query parameters (compulsory). Users can also provide optional query param 'dataTypes' which should contain a comma separated string of fitness datatypes to filter the data list.

### Google Access

In case, User has revoked google access from outside the app, User's Google access token will be removed from our database, once \`_/sync_\` endpoint is called by the user.

###

## Carecentive-Framework

### Implementation

Setup your google console app for authentication by following \`SetupGoogleAuth.pdf\` file.

Update \`_.env_\` file with your google console app credentials as GCLIENT_ID, GCLIENT_SECRET and GREDIRECT_URI. For example, see \`._env.example_\` file.

Check out the file \`_app.js_\`. Express Router stored in the @carecentive/carecentive-core/routes/googleFitness contains all the API endpoints necessary for Google Fitness integration. It can be used with express apps.

Cron Job is also created for daily auto-synchronization of fitness data for each User which collects data everyday at midnight. See file \`_services/DailyFitnessService.js_\`. We only need to import the file in the entry point of the express app.

###

## Vue Example

Check out simple implementation in file _views/Googlefit.vue_ in <https://github.com/carecentive/carecentive-vue-example/tree/feature/google-fit>
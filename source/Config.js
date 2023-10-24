module.exports = {
	fitbit: {
		clientId: process.env.FITBIT_CLIENT_ID,
		codeVerifier: process.env.FITBIT_CODE_VERIFIER,
		basicToken: process.env.FITBIT_BASIC_TOKEN,
		apiUrl: "https://api.fitbit.com",
		oauth2TokenEndpoint: "/oauth2/token",
		grantTypeAuthorizationCode: "authorization_code",
		grantTypeRefreshToken: "refresh_token",
		contentType: "application/x-www-form-urlencoded",
		authorizationHeader: "Basic " + process.env.FITBIT_BASIC_TOKEN
	}
};
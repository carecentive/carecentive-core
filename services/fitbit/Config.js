module.exports = {
	apiUrl: "https://api.fitbit.com",
	oauth2TokenEndpoint: "/oauth2/token",
	grantTypeAuthorizationCode: "authorization_code",
	grantTypeRefreshToken: "refresh_token",
	contentType: "application/x-www-form-urlencoded",
	requestType: {
		heart: "heart",
		activeZoneMinutes: "active-zone-minutes",
		calories: "calories",
		distance: "distance",
		elevation: "elevation",
		floors: "floors",
		steps: "steps",
		breathingRate: "br",
		heartRateVariability: "hrv",
		spO2: "spo2"
	},
	detailLevel: {
		oneSecond: "1sec",
		oneMinute: "1min"
	}
};
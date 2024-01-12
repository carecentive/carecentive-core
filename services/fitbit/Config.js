module.exports = {
	apiUrl: "https://api.fitbit.com",
	oauth2TokenEndpoint: "/oauth2/token",
	grantTypeAuthorizationCode: "authorization_code",
	grantTypeRefreshToken: "refresh_token",
	contentType: "application/x-www-form-urlencoded",
	requestType: {
		heart: "activities/heart",
		activeZoneMinutes: "activities/active-zone-minutes",
		calories: "activities/calories",
		distance: "activities/distance",
		elevation: "activities/elevation",
		floors: "activities/floors",
		steps: "activities/steps",
		breathingRate: "br",
		heartRateVariability: "hrv",
		spO2: "spo2",
		foodLogsCalories: "foods/log/caloriesIn",
		foodLogsWater: "foods/log/water",
		bodyBmi: "body/bmi",
		bodyFat: "body/fat",
		bodyWeight: "body/weight"
	},
	detailLevel: {
		oneSecond: "1sec",
		oneMinute: "1min"
	}
};
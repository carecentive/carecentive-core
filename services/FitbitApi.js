const { FitbitApiError } = require('@carecentive/carecentive-core/source/Errors');
const axios = require('axios');

class FitbitApi {
    static async apiSetup(authorizationCode) {
        try {
            // Define the API endpoint and request payload
            const apiUrl = 'https://api.fitbit.com/oauth2/token';
            
            const data = new URLSearchParams();
            data.append('client_id', process.env.FITBIT_CLIENT_ID);
            data.append('code', authorizationCode);
            data.append('code_verifier', process.env.FITBIT_CODE_VERIFIER);
            data.append('grant_type', 'authorization_code');

            // Define request headers
            const headers = {
                'Authorization': 'Basic ' + process.env.FITBIT_BASIC_TOKEN,
                'Content-Type': 'application/x-www-form-urlencoded',
            };

            const response = await axios({
                method: "post",
                url: apiUrl,
                data: data,
                headers: headers
            });

            if (response.status == "200") {
                return response.data
            } else {
                throw new FitbitApiError(response.status + " (" + response.data.errors + ")")
            }
        } catch (error) {
            throw error
        }
    }
}

module.exports = FitbitApi;
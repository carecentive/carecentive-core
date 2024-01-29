const axios = require("axios");
const moment = require("moment");
const { google } = require("googleapis");
const fitness = google.fitness("v1");

const ghelper = require("../source/google");
const GoogleUser = require("../models/GoogleUserModel");
const GoogleData = require("../models/GoogleDataModel");

class GoogleFitnessService {
  //Returns Google Authorization Tokens for User
  static async getUser(userId) {
    let user = await GoogleUser.query().findOne({ user_id: userId });
    return user;
  }

  //Returns a list of all google fitness users in the database
  static async getAllGoogleUser() {
    let allusers = await GoogleUser.query();
    return allusers;
  }

  // Add/Update Google Authorization token for User
  static async addUser(user) {
    let oldUser = await GoogleUser.query().findOne({ user_id: user.user_id });
    if (oldUser) {
      let thisUser = await oldUser.$query().updateAndFetch({
        access_token: user.access_token,
        id_token: user.id_token,
        refresh_token: user.refresh_token,
      });
      return thisUser;
    } else {
      let newUser = await GoogleUser.query().insert(user);
      return newUser;
    }
  }

  // Revoke Google Authorization Token for User
  static async removeUser(user_id) {
    let user = await this.getUser(user_id);
    let oauth2Client = ghelper.getAuthClient(user);
    try {
      const rev = await oauth2Client.revokeToken(user.refresh_token);
    } catch (e) {
      console.log("Token already expired.");
    }
    let deleted = await GoogleUser.query().delete().where({ user_id });
    if (deleted) {
      return;
    } else {
      throw new Error("GOOGLE_USER_DELETION_ERROR");
    }
  }

  //Returns List of Datatypes available in our database
  static async fetchDatatypes(userId) {
    const result = await GoogleData.query()
      .distinct("datatype")
      .pluck("datatype");
    return result;
  }

  //Returns Array of User Fitness Data based on provided query
  static async fetchData(userId, from, to, types) {
    let from_date = new Date(from).getTime() / 1000;
    let to_date = new Date(to).getTime() / 1000;
    let query = GoogleData.query()
      .select(
        "id",
        "data",
        "value",
        "format",
        "datatype",
        GoogleData.raw('from_unixtime(on_date,"%Y-%m-%d") as on_date')
      )
      .where({ user_id: userId })
      .where("on_date", ">", from_date)
      .where("on_date", "<=", to_date);
    if (types && types.length) {
      query = query.whereIn("datatype", types);
    }
    query = query.orderBy("on_date");
    const result = await query;
    return result;
  }

  //Returns date range necessary to fetch Fitness data from Google
  static async fetchLastData(userId) {
    let fromDate = moment().format("YYYY-MM-DD");
    let toDate = moment().add(1, "days").format("YYYY-MM-DD");
    const result =
      (await GoogleData.query()
        .select(
          "id",
          GoogleData.raw('from_unixtime(on_date,"%Y-%m-%d") as on_date')
        )
        .where({ user_id: userId })
        .orderBy("on_date", "desc")
        .first()) ?? null;
    if (result) {
      fromDate = moment(result.on_date).format("YYYY-MM-DD");
    }
    return { fromDate, toDate };
  }

  //Calls Fitness API for User with provided Date Range
  static async syncData(googleUser) {
    let { fromDate, toDate } = await this.fetchLastData(userId);
    await this.fetchFitnessData(googleUser, fromDate, toDate);
    return { message: "Data fetched from Google Fitness" };
  }

  //Calls Fitness API to list of available Data Sources used by the User
  static async fetchDataSource(client) {
    try {
      let allSources = await fitness.users.dataSources.list({
        auth: client,
        userId: "me",
      });
      return ghelper.filterDatatypes(allSources.data.dataSource);
    } catch (err) {
      console.log(err);
    }
  }

  //Fetch and collect Fitness Data based on Data Sources available for the User
  static async fetchFitnessData(user, fromDate, toDate) {
    let oauth2Client = ghelper.getAuthClient(user);
    let allSources = await this.fetchDataSource(oauth2Client);
    allSources.map(async (dt) => {
      try {
        const requestParams = {
          auth: oauth2Client,
          userId: "me",
          requestBody: {
            aggregateBy: [{ dataTypeName: dt.type }],
            bucketByTime: {
              durationMillis: 86400000, // 1 day in milliseconds
            },
            startTimeMillis: new Date(fromDate).getTime(),
            endTimeMillis: new Date(toDate).getTime(),
          },
        };
        //Separate requests are made for each datatype to avoid errors in case of missing data in Fitness
        fitness.users.dataset.aggregate(
          requestParams,
          async (err, response) => {
            if (err) {
              console.error("Error aggregating data:", err.response.data);
              console.log(err.response.data.error.errors);
            } else {
              await this.saveFitnessData(user, response.data.bucket, dt);
            }
          }
        );
      } catch (err) {
        console.log("==============");
        console.log(err.response.data);
        console.log("==============");
      }
    });
  }

  //Collect/Update Fitness Data for each date for user
  static async saveFitnessData(user, buckets, datatype) {
    buckets.forEach(async (bucket) => {
      let dataPoints = bucket.dataset[0].point;
      if (dataPoints.length) {
        let data = {
          user_id: user.user_id,
          datatype: datatype.name,
          format: datatype.format,
          value: dataPoints[0].value[0][datatype.format]
            ? dataPoints[0].value[0][datatype.format]
            : "",
          on_date: bucket.startTimeMillis / 1000, // Time in Seconds
          data: JSON.stringify(dataPoints[0].value[0]), //Raw data from Fitness API
        };
        //If data already exists for given date, datatype and user, Update data
        const previousData = await GoogleData.query()
          .select("id")
          .where({
            user_id: user.user_id,
            datatype: datatype.name,
            on_date: bucket.startTimeMillis / 1000,
          });
        if (previousData.length) {
          let updateValues = {
            added_on: new Date(),
            value: data.value,
            data: data.data,
          };
          await GoogleData.query()
            .patch(updateValues)
            .where("id", previousData[0].id);
        } else {
          await GoogleData.query().insert(data);
        }
      }
    });
  }
}

module.exports = GoogleFitnessService;

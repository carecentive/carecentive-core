const { Model } = require("objection");

const User = require("./User");

class GoogleData extends Model {
  static get tableName() {
    return "google_data";
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "google_data.user_id",
        to: "user.id",
      },
    },
  };
}

module.exports = GoogleData;

const { Model } = require("objection");

const User = require("@carecentive/carecentive-core/models/User");

class GoogleUser extends Model {
  static get tableName() {
    return "google_users";
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "google_users.user_id",
        to: "user.id",
      },
    },
  };
}

module.exports = GoogleUser;

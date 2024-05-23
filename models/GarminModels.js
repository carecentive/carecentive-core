const { Model } = require('objection');
const UserModel = require('./User');

class GarminUser extends Model {
  static get tableName() {
    return 'garmin_users';
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel, // Assuming UserModel is defined elsewhere
        join: {
          from: 'garmin_users.user_id',
          to: 'users.id'
        }
      }
    };
  }
}

class GarminApiResponse extends Model {
  static get tableName() {
    return 'garmin_api_responses';
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserModel, // Assuming UserModel is defined elsewhere
        join: {
          from: 'garmin_api_responses.user_id',
          to: 'users.id'
        }
      }
    };
  }
}

// Assuming UserModel is defined in another file, import it here:
// const UserModel = require('./path/to/UserModel');

module.exports = { GarminUser, GarminApiResponse };

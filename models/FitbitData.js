const { Model } = require('objection');
const User = require('./User');

class FitbitData extends Model {
  static tableName = 'user_fitbit_data';

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_fitbit_data.user_id',
        to: 'users.id'
      }
    }
  };
}

module.exports = FitbitData;
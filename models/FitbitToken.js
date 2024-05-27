const { Model } = require('objection');

const User = require('./User');

class FitbitToken extends Model {
  static tableName = 'user_fitbit_tokens';

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_fitbit_tokens.user_id',
        to: 'user.id'
      }
    }
  };
}

module.exports = FitbitToken;
const { Model } = require('objection');

const User = require('./User');

class WithingsToken extends Model {
  static get tableName() {
    return 'user_withings_tokens';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_withings_token.user_id',
        to: 'user.id'
      }
    }
  };
}

module.exports = WithingsToken;
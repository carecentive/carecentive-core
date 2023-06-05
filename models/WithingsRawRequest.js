const { Model } = require('objection');
const User = require('./User');

class WithingsRawRequest extends Model {
  static get tableName() {
    return 'user_withings_raw_requests';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_withings_raw_requests.user_id',
        to: 'user.id'
      }
    }
  };

}

module.exports = WithingsRawRequest;
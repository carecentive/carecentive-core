const { Model } = require('objection');

const User = require('./User');

class Analytics extends Model {
  static get tableName() {
    return 'analytics';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'analytics.user_id',
        to: 'users.id'
      }
    }
  };

}

module.exports = Analytics;
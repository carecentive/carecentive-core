const { Model } = require('objection');

const User = require('./User');

class PushSubscription extends Model {
  static get tableName() {
    return 'user_push_subscriptions';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_push_subscriptions.user_id',
        to: 'user.id'
      }
    }
  };

}

module.exports = PushSubscription;
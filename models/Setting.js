const { Model } = require('objection');

const User = require('./User');

class Setting extends Model {
  static get tableName() {
    return 'user_settings';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_settings.user_id',
        to: 'user.id'
      }
    }
  };

}

module.exports = Setting;

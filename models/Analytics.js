const { Model } = require('objection');

const User = require('./User');

class Questionnaire extends Model {
  static get tableName() {
    return 'analytics';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'analytics.user_id',
        to: 'user.id'
      }
    }
  };

}

module.exports = Questionnaire;
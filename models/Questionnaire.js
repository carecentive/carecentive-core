const { Model } = require('objection');

const User = require('./User');

class Questionnaire extends Model {
  static get tableName() {
    return 'user_questionnaires';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_questionnaires.user_id',
        to: 'user.id'
      }
    }
  };

}

module.exports = Questionnaire;
const { Model } = require('objection');

const User = require('./User');

class JournalEntry extends Model {
  static get tableName() {
    return 'user_journal_entries';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_journal_entries.user_id',
        to: 'users.id'
      }
    }
  };

}

module.exports = JournalEntry;

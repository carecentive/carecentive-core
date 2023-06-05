const { Model } = require('objection');

const User = require('./User');

class File extends Model {
  static get tableName() {
    return 'user_files';
  }

  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: 'user_files.user_id',
        to: 'user.id'
      }
    }
  };

}

module.exports = File;
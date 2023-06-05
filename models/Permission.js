const { Model } = require('objection');

const User = require('./User');

class Permission extends Model {
  static get tableName() {
    return 'permissions';
  }
}

module.exports = Permission;

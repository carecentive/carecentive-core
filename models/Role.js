const { Model } = require('objection');

const Permission = require('./Permission');

class Role extends Model {
  static get tableName() {
    return 'roles';
  }

  static relationMappings = {
    permissions: {
      relation: Model.ManyToManyRelation,
      modelClass: Permission,
      join: {
        from: 'roles.id',
        through: {
          from: 'role_permissions.role_id',
          to: 'role_permissions.permission_id'
        },
        to: 'permissions.id'
      }
    }
  };
}

module.exports = Role;

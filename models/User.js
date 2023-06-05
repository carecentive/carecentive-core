const { Model } = require('objection');

const Role = require('./Role');

class User extends Model {
  static get tableName() {
    return 'users';
  }

  static relationMappings = {
    roles: {
      relation: Model.ManyToManyRelation,
      modelClass: Role,
      join: {
        from: 'users.id',
        through: {
          // persons_movies is the join table.
          from: 'user_roles.user_id',
          to: 'user_roles.role_id'
        },
        to: 'roles.id'
      }
    }
  };
}

module.exports = User;

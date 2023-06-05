
exports.up = function(knex) {
  return Promise.all([
    knex.schema.createTable('roles', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
    }),
    knex.schema.createTable('permissions', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
    }),
    knex.schema.createTable('user_roles', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.foreign('user_id').references('users.id')
      table.integer('role_id').unsigned();
      table.foreign('role_id').references('roles.id')
    }),
    knex.schema.createTable('role_permissions', function(table) {
      table.increments('id').primary();
      table.integer('role_id').unsigned();
      table.foreign('role_id').references('roles.id')
      table.integer('permission_id').unsigned();
      table.foreign('permission_id').references('permissions.id')
    }),
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('roles'),
    knex.schema.dropTable('permissions'),
    knex.schema.dropTable('user_roles'),
    knex.schema.dropTable('role_permissions'),
  ])
};

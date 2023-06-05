
exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('users', function(table) {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.string('email');
            table.string('password_hash').notNullable();
            table.timestamps(false, true);
        }),
        knex.schema.createTable('user_questionnaires', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id');
            table.string('questionnaire');
            table.datetime('datetime');
            table.json('data');
            table.json('meta');
            table.timestamps(false, true);
        }),
        knex.schema.createTable('user_files', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id')
            table.datetime('datetime');
            table.string('type');
            table.string('fileref');
            table.json('meta');
            table.timestamps(false, true);
        }),
        knex.schema.createTable('user_settings', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id');
            table.string('key'); // Key-value store for user settings
            table.text('data');
            table.timestamps(false, true);
          })
      


    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('user_questionnaires'),
        knex.schema.dropTable('user_files'),
        knex.schema.dropTable('user_settings'),
        knex.schema.dropTable('users')
    ])
};

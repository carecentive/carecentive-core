exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('garmin_api_responses', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id');
            table.text('response_type');
            table.date('response_date');
            table.text('response_data');
            table.timestamps(false, true);
        }),
        knex.schema.createTable('garmin_users', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id');
            table.string('garmin_user_id');
            table.string('garmin_access_token');
            table.string('garmin_access_secret');
            table.timestamps(false, true);
        }),
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('garmin_api_responses'),
        knex.schema.dropTable('garmin_api_dev'),
        knex.schema.dropTable('garmin_users'),
    ]);
};
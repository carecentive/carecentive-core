
exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('user_withings_tokens', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id');
            table.string('withings_user_id').nullable();
            table.datetime('token_last_updated');
            table.string('access_token');
            table.string('expiration_date');
            table.string('refresh_token');
            table.string('scope');
            table.timestamps(false, true);
        }),
        knex.schema.createTable('user_withings_raw_requests', function(table) {
            table.increments('id').primary();
            table.integer('user_id').unsigned().notNullable();
            table.foreign('user_id').references('users.id')
            table.string('request_type');
            table.timestamp('request_timestamp');
            //table.datetime('request_datetime');
            table.integer('startdate').nullable();
            table.integer('enddate').nullable();
            table.date('startdateymd');
            table.date('enddateymd');
            table.integer('lastupdate');
            table.text('type_fields');
            table.boolean('more');
            table.boolean('offset');
            table.text('response', 'mediumtext');
            table.timestamps(false, true);
        }),
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('user_withings_raw_requests'),
        knex.schema.dropTable('user_withings_tokens'),
    ])
};

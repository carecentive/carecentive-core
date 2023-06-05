
exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTable('analytics', function(table) {
            table.increments('id').primary();
            table.datetime('datetime').defaultTo(knex.fn.now());
            table.integer('user_id').unsigned();
            table.foreign('user_id').references('users.id')
            table.string('type');
            table.string('name');
            table.json('details');
            table.timestamps(false, true);
        })
    ])
};

exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('analytics'),
    ])
};


exports.up = function(knex) {
    return knex.schema.createTable("gaia_x_participants", function (table) {
        table.increments("id").primary();
        table.string("slug", 50).notNullable().unique();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable("gaia_x_participants");
};

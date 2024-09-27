
exports.up = function(knex) {
    return knex.schema.createTable("gaia_x_data_products", function (table) {
        table.specificType("id", 'CHAR(36)').primary();
        table.integer("participant_id").unsigned().notNullable();
        table.string("title", 100).notNullable();
        table.string("description", 5000).notNullable();
        table.string("route", 100).notNullable();
        table.timestamps(true, true);

        table.foreign('participant_id', 'gaia_x_data_products_fk_participant_id')
            .references('gaia_x_participants.id')
            .onDelete('RESTRICT')
            .onUpdate('RESTRICT');
    });
};

exports.down = function(knex) {
    knex.schema.table("gaia_x_data_products", function (table) {
        table.dropForeign('participant_id', 'gaia_x_data_products_fk_participant_id');
    });
  return knex.schema.dropTable("gaia_x_data_products");
};

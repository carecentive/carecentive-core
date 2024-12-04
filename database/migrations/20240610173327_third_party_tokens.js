
exports.up = function(knex) {
    return knex.schema.createTable("third_party_tokens", function (table) {
        table.increments("id").primary();
        table.boolean("active").notNullable();
        table.datetime("valid_till");
        table.specificType("access_token", 'CHAR(80)').notNullable().unique();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable("third_party_tokens");
};

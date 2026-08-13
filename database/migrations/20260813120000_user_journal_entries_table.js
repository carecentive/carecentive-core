exports.up = function (knex) {
  return knex.schema.createTable("user_journal_entries", function (table) {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.foreign("user_id").references("users.id");
    table.string("title");
    table.json("categories");
    table.text("text").notNullable();
    table.json("meta");
    table.datetime("entry_date").notNullable().defaultTo(knex.fn.now());
    table.timestamps(false, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("user_journal_entries");
};

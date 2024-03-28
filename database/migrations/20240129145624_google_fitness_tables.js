/* 
  'google_users' table stores google tokens and details for user required for verification/access to fitness data.
  'google_data' table stores user data from Google Fit API. The columns 'datatype' and 'value' are used for stored 
  user data for easy readings with corresponding dates in seconds on 'on_date' column. The column 'data' contains 
  user data as received from Google API and can be used with the help of 'format' column to read the data.
*/
exports.up = function (knex) {
  return Promise.all([
    knex.schema.createTable("google_users", function (table) {
      table.increments("id").primary();
      table.integer("user_id").unsigned().notNullable();
      table.foreign("user_id").references("users.id");
      table.string("email").notNullable();
      table.string("access_token");
      table.string("id_token", 5000);
      table.string("refresh_token");
      table.timestamps(false, true);
    }),
    knex.schema.createTable("google_data", function (table) {
      table.increments("id").primary();
      table.integer("user_id").unsigned().notNullable();
      table.foreign("user_id").references("users.id");
      table.string("datatype").notNullable();
      table.string("format").notNullable();
      table.string("value").notNullable();
      table.json("data");
      table.bigInteger("on_date");
      table.timestamp("added_on").defaultTo(knex.fn.now());
    }),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.dropTable("google_users"),
    knex.schema.dropTable("google_data"),
  ]);
};

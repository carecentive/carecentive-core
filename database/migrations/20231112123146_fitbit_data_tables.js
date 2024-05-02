exports.up = function (knex) {
	return Promise.all([
		knex.schema.createTable("user_fitbit_data", function(table) {
			table.increments("id").primary();
			table.integer("user_id").unsigned().notNullable();
			table.foreign("user_id").references("users.id");
			table.string("request_type");
			table.timestamp("request_timestamp");
			table.timestamp("from_timestamp").nullable();
			table.timestamp("to_timestamp").nullable();
			table.text("response", "mediumtext");
			table.timestamps(false, true);
		})
	]);
};

exports.down = function(knex) {
	return Promise.all([
		knex.schema.dropTable("user_fitbit_data")
	]);
};
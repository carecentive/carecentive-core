exports.up = function (knex) {
	return Promise.all([
		knex.schema.createTable("user_fitbit_tokens", function (table) {
			table.increments("id").primary();
			table.integer("user_id").unsigned().notNullable();
			table.foreign("user_id").references("users.id");
			table.string("fitbit_user_id").nullable();
			table.datetime("fitbit_member_since");
			table.datetime("token_last_updated");
			table.string("access_token", 1000);
			table.string("expiration_date");
			table.string("refresh_token");
			table.string("scope");
			table.timestamps(false, true);
		})
	]);
};

exports.down = function (knex) {
	return Promise.all([
		knex.schema.dropTable("user_fitbit_tokens")
	]);
};
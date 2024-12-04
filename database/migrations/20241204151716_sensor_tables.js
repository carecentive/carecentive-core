exports.up = function (knex) {
  return Promise.all([
    knex.schema.createTable('sensors', (table) => {
      table.increments('id').primary();
      table.string('sensor_identifier').notNullable();
      table.text('description');
      table.json('meta');
      table.timestamps(false, true);
    }),
    knex.schema.createTable('sensor_keys', (table) => {
      table.increments('id').primary();
			table.integer('sensor_id').unsigned(); // optional - can be tied to sensor, but not necessary for simple setups
			table.foreign('sensor_id').references('sensors.id');
      table.integer('user_id').unsigned(); // optional - can be tied to user, but not necessary for simple setups
			table.foreign('user_id').references('users.id');
      table.string('sensor_identifier').notNullable();
      table.string('api_key').notNullable().unique();
      table.timestamp('expires_at'); 
      table.boolean('is_active').defaultTo(true);
      table.timestamps(false, true);
    }),
    knex.schema.createTable('users_sensors', (table) => {
      table.increments('id').primary();
			table.integer('sensor_id').unsigned().notNullable();
			table.foreign('sensor_id').references('sensors.id');
      table.integer('user_id').unsigned().notNullable();
			table.foreign('user_id').references('users.id');
      table.datetime('date_assigned_from');
      table.datetime('date_assigned_to');
      table.text('notes');
      table.timestamps(false, true);
    })
  ])
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('users_sensors'),
    knex.schema.dropTableIfExists('sensor_keys'),
    knex.schema.dropTableIfExists('sensors')
  ])
};
exports.up = function (knex) {
  return knex.schema.createTable('sensor_data', (table) => {
    table.increments('id').primary(); // Primary key
    table.timestamp('datetime_received').defaultTo(knex.fn.now()); // Default to current timestamp
    table.datetime('datetime_reported'); // Reported datetime
    table.string('sensor_identifier').notNullable(); // Sensor identifier
    table.json('data').notNullable(); // Data as JSON
    table.json('meta'); // Meta as JSON (optional)
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sensor_data');
};
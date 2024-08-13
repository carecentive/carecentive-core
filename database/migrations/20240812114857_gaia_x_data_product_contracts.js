
exports.up = function(knex) {
    return knex.schema.createTable("gaia_x_data_product_contracts", function (table) {
        table.specificType("id", 'CHAR(36)').primary();
        table.string("state", 50).notNullable();
        table.specificType("data_product_id", 'CHAR(36)').notNullable();
        table.string("consumer_participant", 100).notNullable();
        table.string("consumer_did", 100).notNullable();
        table.specificType("proposal_fingerprint", 'CHAR(64)').notNullable();
        table.specificType("consumer_participant_fingerprint", 'CHAR(64)').notNullable();
        table.specificType("consumer_did_fingerprint", 'CHAR(64)').notNullable();
        table.specificType("consumer_certificate_fingerprint", 'CHAR(64)').notNullable();
        table.string("consumer_proof_signature", 500).nullable();
        table.timestamps(true, true);

        table.foreign('data_product_id', 'gaia_x_data_product_contracts_fk_data_product_id')
            .references('gaia_x_data_products.id')
            .onDelete('RESTRICT')
            .onUpdate('RESTRICT');
    });
};

exports.down = function(knex) {
    knex.schema.table("gaia_x_data_product_contracts", function (table) {
        table.dropForeign('data_product_id', 'gaia_x_data_product_contracts_fk_data_product_id');
    });
    return knex.schema.dropTable("gaia_x_data_product_contracts");
};

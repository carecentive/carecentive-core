
exports.up = function(knex) {
    return knex.schema.table("third_party_tokens", function (table) {
        table.string("route", 100).nullable();
    });
};

exports.down = function(knex) {
    return knex.schema.table("third_party_tokens", function (table) {
        table.dropColumn("route");
    });
};

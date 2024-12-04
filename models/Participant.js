const { Model } = require("objection");

class Participant extends Model {

    /**
     * Maximum slug length
     *
     * @type {int}
     */
    static LIMIT_SLUG = 50;

    /**
     * @type {int}
     */
    id;
    /**
     * @type {string}
     */
    slug;
    created_at;
    updated_at;
    static get tableName() {
        return "gaia_x_participants";
    }
}

module.exports = Participant;

const { Model } = require("objection");
const Participant = require("./Participant");

class DataProduct extends Model {

    /**
     * Maximum length of the title attribute
     *
     * @type {number}
     */
    static LIMIT_TITLE = 100;
    /**
     *
     * Maximum length of the description attribute
     *
     * @type {number}
     */
    static LIMIT_DESCRIPTION = 5000;
    /**
     * Maximum length of the title attribute
     *
     * @type {number}
     */
    static LIMIT_ROUTE = 100;

    /**
     * @type {string}
     */
    id;

    /**
     * @type {int}
     */
    participant_id;

    /**
     * @type {string}
     */
    title;

    /**
     * @type {string}
     */
    description;

    /**
     * @type {string}
     */
    route;

    created_at;
    updated_at;
    static get tableName() {
        return "gaia_x_data_products";
    }

    static relationMappings = {
        participant: {
            relation: Model.BelongsToOneRelation,
            modelClass: Participant,
            join: {
                from: 'gaia_x_data_products.participant_id',
                to: 'gaia_x_participants.id'
            }
        }
    };
}

module.exports = DataProduct;

const { Model } = require("objection");
const Participant = require("./Participant");

class DataProduct extends Model {
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

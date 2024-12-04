const { Model } = require("objection");
const DataProduct = require("./DataProduct");

class DataProductContract extends Model {

    static STATE_CONSUMER_SIGNATURE_PENDING = 'CONSUMER_SIGNATURE_PENDING';
    static STATE_PRODUCER_SIGNATURE_PENDING = 'PRODUCER_SIGNATURE_PENDING';
    static STATE_READY_TO_BE_CLAIMED = 'READY_TO_BE_CLAIMED';
    static STATE_REJECTED = 'REJECTED';
    static STATE_FINALIZED = 'FINALIZED';

    /**
     * @type {string}
     */
    id;

    /**
     * @type {string}
     */
    state;

    /**
     * @type {string}
     */
    data_product_id;

    /**
     * @type {string}
     */
    consumer_participant;

    /**
     * @type {string}
     */
    consumer_did;

    /**
     * @type {string}
     */
    proposal_fingerprint;

    /**
     * @type {string}
     */
    consumer_participant_fingerprint;

    /**
     * @type {string}
     */
    consumer_did_fingerprint;

    /**
     * @type {string}
     */
    consumer_certificate_fingerprint;

    /**
     * @type {string|null}
     */
    consumer_proof_signature;

    created_at;
    updated_at;
    static get tableName() {
        return "gaia_x_data_product_contracts";
    }

    static relationMappings = {
        data_product: {
            relation: Model.BelongsToOneRelation,
            modelClass: DataProduct,
            join: {
                from: 'gaia_x_data_product_contracts.data_product_id',
                to: 'gaia_x_data_products.id'
            }
        }
    };
}

module.exports = DataProductContract;

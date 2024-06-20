const { Model } = require("objection");

class ThirdPartyToken extends Model {
    /**
     * @type {int}
     */
    id;

    /**
     * @type {boolean}
     */
    active;
    valid_till;
    /**
     * @type {string}
     */
    access_token;
    created_at;
    updated_at;
    static get tableName() {
        return "third_party_tokens";
    }
}

module.exports = ThirdPartyToken;

const { Model } = require('objection');

let _knex = null;

function init(knexInstance) {
  _knex = knexInstance;
  Model.knex(knexInstance);
}

module.exports = {
  Model,
  get knex() { return _knex; },
  init,
};

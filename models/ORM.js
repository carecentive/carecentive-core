const { Model } = require('objection');
const dotenv = require('dotenv');

dotenv.config();

const knex = require('knex')({
    client: 'mysql2',
    connection: {
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD
    }
  });
  
Model.knex(knex);

module.exports = {Model, knex};
const { Pool } = require('pg');
const dotenv = require('dotenv');

require('dotenv').config();


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database');
  release();
});

pool.query('SELECT current_database()', (err, res) => {
  if (err) {
    console.error('Failed to confirm DB name:', err);
  } else {
    console.log('CONNECTED TO DATABASE:', res.rows[0].current_database);
  }
});


module.exports = {
  query: (text, params) => pool.query(text, params),
}; 
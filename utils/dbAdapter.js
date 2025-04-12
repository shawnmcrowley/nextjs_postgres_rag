// /util/dbAdapter.js

import pgPromise from 'pg-promise';

const pgp = pgPromise({});

const connection = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

const dbAdapter = pgp(connection);

export default dbAdapter;
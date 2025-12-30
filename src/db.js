const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definido no .env");
}

const useSSL = String(process.env.PGSSL || "").toLowerCase() === "true";

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};

import dotenv from "dotenv";
import mysql from "mysql2";

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'otra'
});

export default db;
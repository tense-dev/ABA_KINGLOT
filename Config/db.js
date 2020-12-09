const dotenv = require("dotenv");
dotenv.config();
const { argv } = require("yargs");
const DATABASE = process.env.DATABASE //argv.DATABASE;
const USERNAME_DB = process.env.USERNAME_DB //argv.USERNAME;
const PASSWORD = process.env.PASSWORD //argv.PASSWORD;
const HOST = process.env.HOST //argv.HOST;
const mysql = require("mysql");
const connection = mysql.createConnection({
    host: HOST,
    user: USERNAME_DB,
    password: PASSWORD,
    database: DATABASE,
});

console.log(HOST);

connection.connect((error) => {
    if (error) throw error;
    console.log("Successfully connected to the database.");
});

module.exports = connection;
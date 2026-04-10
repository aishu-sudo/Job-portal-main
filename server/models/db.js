const oracledb = require('oracledb');

async function getConnection() {
    return await oracledb.getConnection({
        user: "system",
        password: "your_password",
        connectString: "localhost/XE"
    });
}

module.exports = getConnection;
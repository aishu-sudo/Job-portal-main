const oracledb = require('oracledb');

async function getConnection() {
    return await oracledb.getConnection({
        user: "system",
        password: "aishu",
        connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=127.0.0.1)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=XEPDB1)))"
    });
}

module.exports = getConnection;
const oracledb = require('oracledb');

function getOracleConfig() {
    const host = process.env.ORACLE_DB_HOST || '127.0.0.1';
    const port = process.env.ORACLE_DB_PORT || '1521';
    const serviceName = process.env.ORACLE_DB_SERVICE || 'XEPDB1';

    return {
        user: process.env.ORACLE_DB_USER || 'system',
        password: process.env.ORACLE_DB_PASSWORD || 'aishu',
        connectString: process.env.ORACLE_DB_CONNECT_STRING ||
            `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${serviceName})))`
    };
}

async function getConnection() {
    return oracledb.getConnection(getOracleConfig());
}
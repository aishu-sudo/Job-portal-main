const oracledb = require('oracledb');

async function runTest() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system',
            password: 'aishu',
            connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle!');

        // Check if schema tables exist
        const r = await conn.execute(
            "SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER='SYSTEM' AND TABLE_NAME IN ('USERS','JOBS','APPLICATIONS','PAYMENTS') ORDER BY TABLE_NAME",
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('Project tables found:', r.rows.map(x => x.TABLE_NAME));

        if (r.rows.length === 0) {
            console.log('\nSchema not set up yet! Run schema.sql first.');
            console.log('Instructions: See below');
        } else {
            // Test insert
            const users = await conn.execute(
                'SELECT COUNT(*) CNT FROM USERS',
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            console.log('Users in DB:', users.rows[0].CNT);
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
        console.log('Done.');
    }
}

runTest();

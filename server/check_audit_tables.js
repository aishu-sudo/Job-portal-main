const oracledb = require('oracledb');

async function checkAuditTables() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system',
            password: 'aishu',
            connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle DB\n');

        const auditTables = ['Audit_Users', 'Audit_Jobs', 'Audit_Applications', 'Audit_Payments'];

        console.log('=== AUDIT TABLE STATUS ===\n');

        for (const table of auditTables) {
            const result = await conn.execute(
                `SELECT COUNT(*) AS CNT FROM ${table}`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const count = result.rows[0].CNT;
            const status = count === 0 ? 'EMPTY' : `NOT EMPTY (${count} row${count !== 1 ? 's' : ''})`;
            console.log(`  ${table.padEnd(22)}: ${status}`);
        }

        console.log('\n=== SAMPLE ROWS (first 5 per non-empty table) ===');

        for (const table of auditTables) {
            const countResult = await conn.execute(
                `SELECT COUNT(*) AS CNT FROM ${table}`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const count = countResult.rows[0].CNT;
            if (count > 0) {
                const rows = await conn.execute(
                    `SELECT * FROM ${table} WHERE ROWNUM <= 5`,
                    [],
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );
                console.log(`\n-- ${table} (${count} total rows) --`);
                console.table(rows.rows);
            }
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

checkAuditTables();

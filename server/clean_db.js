/**
 * clean_db.js
 * Deletes ALL rows from every table and resets every sequence back to 1.
 * Keeps the schema (tables, procedures, triggers) completely intact.
 * Run once: node clean_db.js
 */
const oracledb = require('oracledb');

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system', password: 'aishu', connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle DB\n');

        // ── STEP 1: Delete all rows (FK-safe order) ──────────────────────────
        // Audit tables have no FK constraints → delete first (any order)
        // Then child tables (Payments, Applications) before parent (Jobs, Users)
        const deletions = [
            'Audit_Payments',
            'Audit_Applications',
            'Audit_Jobs',
            'Audit_Users',
            'Payments',
            'Applications',
            'Jobs',
            'Users',
        ];

        console.log('=== DELETING ALL ROWS ===');
        for (const table of deletions) {
            const result = await conn.execute(
                `DELETE FROM ${table}`,
                [],
                { autoCommit: false }
            );
            console.log(`  ${table.padEnd(22)} ${result.rowsAffected} row(s) deleted`);
        }
        await conn.commit();
        console.log('  All rows committed.\n');

        // ── STEP 2: Reset all sequences back to 1 ────────────────────────────
        const sequences = [
            'user_seq',
            'job_seq',
            'app_seq',
            'payment_seq',
            'audit_user_seq',
            'audit_job_seq',
            'audit_app_seq',
            'audit_payment_seq',
        ];

        console.log('=== RESETTING SEQUENCES TO 1 ===');
        for (const seq of sequences) {
            await conn.execute(
                `ALTER SEQUENCE ${seq} RESTART START WITH 1`,
                [],
                { autoCommit: true }
            );
            console.log(`  ${seq.padEnd(22)} → reset to 1`);
        }

        // ── STEP 3: Verify ────────────────────────────────────────────────────
        console.log('\n=== VERIFICATION ===');
        const tables = ['Users', 'Jobs', 'Applications', 'Payments',
                        'Audit_Users', 'Audit_Jobs', 'Audit_Applications', 'Audit_Payments'];
        for (const t of tables) {
            const r = await conn.execute(
                `SELECT COUNT(*) AS CNT FROM ${t}`,
                [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const count = r.rows[0].CNT;
            console.log(`  ${t.padEnd(24)} ${count === 0 ? '✓ empty' : `!! ${count} rows remain`}`);
        }

        console.log('\nDone. All tables are empty, all sequences start at 1.');
        console.log('Restart the server, then register users and post jobs from the app.\n');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

/**
 * clean_db.js
 * Deletes ALL rows from every table, resets every sequence back to 1,
 * and clears the JSON data files so they stay in sync with the DB.
 * Run once: node clean_db.js
 */
const oracledb = require('oracledb');
const fs = require('fs').promises;
const path = require('path');

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

        // ── STEP 3b: Clear JSON data files (keep in sync with DB) ───────────
        console.log('\n=== CLEARING JSON DATA FILES ===');
        const dataDir = path.join(__dirname, 'data');
        const jsonFiles = ['clients.json', 'freelancers.json', 'admins.json'];
        for (const file of jsonFiles) {
            const filePath = path.join(dataDir, file);
            try {
                await fs.writeFile(filePath, '[]\n', 'utf8');
                console.log(`  ${file.padEnd(22)} cleared`);
            } catch (e) {
                console.log(`  ${file.padEnd(22)} skipped (${e.message})`);
            }
        }

        console.log('\nDone. All tables are empty, all sequences start at 1, JSON files cleared.');
        console.log('Restart the server, then register users and post jobs from the app.\n');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

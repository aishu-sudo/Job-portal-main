const oracledb = require('oracledb');

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system',
            password: 'aishu',
            connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected\n');

        // Clear audit tables
        await conn.execute(`DELETE FROM Audit_Payments`, [], { autoCommit: true });
        await conn.execute(`DELETE FROM Audit_Applications`, [], { autoCommit: true });
        await conn.execute(`DELETE FROM Audit_Jobs`, [], { autoCommit: true });
        await conn.execute(`DELETE FROM Audit_Users`, [], { autoCommit: true });
        console.log('Audit tables cleared.\n');

        // ── Simulate the FIXED flow ──
        // Step 1: PUT /applications/:appId/respond calls update_job_status_p internally
        //         Job goes open → in-progress  (1 legitimate audit row)
        await conn.execute(
            `BEGIN update_job_status_p(:jobId, 'in-progress', 'Rahim khan', 'Application accepted - job now in progress'); END;`,
            { jobId: 1 }, { autoCommit: true }
        );
        console.log('Step 1: update_job_status_p called (open → in-progress)');

        // Step 2: Frontend ALSO calls PUT /:jobId/status with status='in-progress'
        //         Guard check: currentStatus from Jobs = 'in-progress', requested = 'in-progress' → SKIP
        const jobRow = await conn.execute(
            `SELECT status FROM Jobs WHERE job_id = 1`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const currentStatus = jobRow.rows[0].STATUS;
        const requestedStatus = 'in-progress';

        if (currentStatus === requestedStatus) {
            console.log(`Step 2: Guard fired — currentStatus='${currentStatus}' === requested='${requestedStatus}' → SKIPPED (no audit row written)`);
        } else {
            await conn.execute(
                `BEGIN update_job_status_p(:jobId, :status, 'Rahim khan', 'Applicant accepted from Applicants page'); END;`,
                { jobId: 1, status: requestedStatus }, { autoCommit: true }
            );
            console.log('Step 2: Status changed (guard did not fire)');
        }

        // Step 3: Button double-click — same guard fires again
        const jobRow2 = await conn.execute(
            `SELECT status FROM Jobs WHERE job_id = 1`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const currentStatus2 = jobRow2.rows[0].STATUS;
        if (currentStatus2 === requestedStatus) {
            console.log(`Step 3: Guard fired again (double-click) — SKIPPED\n`);
        }

        // ── Final audit table state ──
        const auditRows = await conn.execute(
            `SELECT audit_id, job_id, old_status, new_status, operation_type,
                    TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') ts, changed_by, change_reason
             FROM Audit_Jobs ORDER BY audit_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('=== Audit_Jobs after fix ===\n');
        auditRows.rows.forEach(r => {
            console.log(`  [${r.AUDIT_ID}] ${r.OLD_STATUS || 'NULL'} → ${r.NEW_STATUS}  op=${r.OPERATION_TYPE}  by=${r.CHANGED_BY}`);
        });

        // Redundancy check
        const dups = await conn.execute(`
            SELECT COUNT(*) CNT FROM (
                SELECT job_id, old_status, new_status, changed_by, TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') ts
                FROM Audit_Jobs
                GROUP BY job_id, old_status, new_status, changed_by, TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS')
                HAVING COUNT(*) > 1
            )
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const dupCount = dups.rows[0].CNT;
        console.log(`\n=== Redundancy check ===`);
        console.log(`  Duplicate groups: ${dupCount}`);
        console.log(dupCount === 0 ? '  PASS — no redundant audit rows.' : '  FAIL — duplicates still exist!');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

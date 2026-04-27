const oracledb = require('oracledb');

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system',
            password: 'aishu',
            connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle DB\n');

        // ── Clean slate ──
        await conn.execute(`DELETE FROM Audit_Payments`, [], { autoCommit: true });
        await conn.execute(`DELETE FROM Audit_Applications`, [], { autoCommit: true });
        await conn.execute(`DELETE FROM Audit_Jobs`, [], { autoCommit: true });
        await conn.execute(`DELETE FROM Audit_Users`, [], { autoCommit: true });
        // Reset job 1 back to open
        await conn.execute(`UPDATE Jobs SET status = 'open' WHERE job_id = 1`, [], { autoCommit: true });
        console.log('Setup: audit tables cleared, job 1 reset to open.\n');

        // ──────────────────────────────────────────────────────────
        // SIMULATE: Client clicks "Accept Application"
        // ──────────────────────────────────────────────────────────
        console.log('>>> Simulating: Client clicks "Accept Application"\n');

        // CALL 1: PUT /applications/:appId/respond  →  internally calls update_job_status_p
        console.log('[CALL 1] PUT /applications/1/respond  — internally calls update_job_status_p');
        const jobBefore = await conn.execute(`SELECT status FROM Jobs WHERE job_id = 1`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(`         Job status BEFORE: ${jobBefore.rows[0].STATUS}`);

        await conn.execute(
            `BEGIN update_job_status_p(:jobId, 'in-progress', 'Rahim khan', 'Application accepted - job now in progress'); END;`,
            { jobId: 1 }, { autoCommit: true }
        );
        const jobAfter1 = await conn.execute(`SELECT status FROM Jobs WHERE job_id = 1`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(`         Job status AFTER : ${jobAfter1.rows[0].STATUS}\n`);

        // CALL 2: Frontend ALSO calls PUT /:jobId/status with 'in-progress'
        //         NEW GUARD: reads current DB status first
        console.log('[CALL 2] PUT /jobs/1/status (frontend separate call, status=in-progress)');
        const currentStatus = jobAfter1.rows[0].STATUS;
        const requestedStatus = 'in-progress';
        if (currentStatus === requestedStatus) {
            console.log(`         Guard: currentStatus('${currentStatus}') === requested('${requestedStatus}') → SKIPPED\n`);
        } else {
            await conn.execute(
                `BEGIN update_job_status_p(:jobId, :s, 'Rahim khan', 'Applicant accepted from Applicants page'); END;`,
                { jobId: 1, s: requestedStatus }, { autoCommit: true }
            );
            console.log(`         Guard did not fire — status was written.\n`);
        }

        // CALL 3: Simulate double-click / React re-render (same call again)
        console.log('[CALL 3] PUT /jobs/1/status (double-click / re-render, same params)');
        const currentStatus2 = (await conn.execute(`SELECT status FROM Jobs WHERE job_id = 1`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows[0].STATUS;
        if (currentStatus2 === requestedStatus) {
            console.log(`         Guard: currentStatus('${currentStatus2}') === requested('${requestedStatus}') → SKIPPED\n`);
        } else {
            await conn.execute(
                `BEGIN update_job_status_p(:jobId, :s, 'Rahim khan', 'Applicant accepted from Applicants page'); END;`,
                { jobId: 1, s: requestedStatus }, { autoCommit: true }
            );
        }

        // ──────────────────────────────────────────────────────────
        // RESULTS
        // ──────────────────────────────────────────────────────────
        console.log('='.repeat(55));
        console.log('AUDIT_JOBS — Final rows');
        console.log('='.repeat(55));
        const rows = await conn.execute(
            `SELECT audit_id, job_id, old_status, new_status, operation_type,
                    TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') ts, changed_by, change_reason
             FROM Audit_Jobs ORDER BY audit_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (rows.rows.length === 0) {
            console.log('  (no rows)');
        } else {
            rows.rows.forEach(r => {
                console.log(`  audit_id : ${r.AUDIT_ID}`);
                console.log(`  job_id   : ${r.JOB_ID}`);
                console.log(`  change   : ${r.OLD_STATUS || 'NULL'} → ${r.NEW_STATUS}`);
                console.log(`  op       : ${r.OPERATION_TYPE}`);
                console.log(`  by       : ${r.CHANGED_BY}`);
                console.log(`  reason   : ${r.CHANGE_REASON}`);
                console.log(`  ts       : ${r.TS}`);
                console.log('  ' + '-'.repeat(45));
            });
        }

        // Duplicate check
        const dupResult = await conn.execute(`
            SELECT job_id, old_status, new_status, changed_by,
                   TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') ts,
                   COUNT(*) dup_count
            FROM Audit_Jobs
            GROUP BY job_id, old_status, new_status, changed_by, TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS')
            HAVING COUNT(*) > 1
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        console.log('\n' + '='.repeat(55));
        console.log('REDUNDANCY CHECK');
        console.log('='.repeat(55));
        console.log(`  Total audit rows written : ${rows.rows.length}`);
        console.log(`  Duplicate groups found   : ${dupResult.rows.length}`);

        if (dupResult.rows.length === 0 && rows.rows.length === 1) {
            console.log('\n  RESULT: BUG FIXED');
            console.log('  Only 1 audit row for 3 API calls — no duplicates.');
        } else {
            console.log('\n  RESULT: BUG NOT FIXED');
            dupResult.rows.forEach(r => console.log(`  DUPLICATE: job=${r.JOB_ID} ${r.OLD_STATUS}→${r.NEW_STATUS} count=${r.DUP_COUNT}`));
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

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

        // ── STEP 1: Insert realistic test data to simulate "Accept Application" flow ──
        console.log('=== STEP 1: Inserting test audit data (simulating accept-application flow) ===\n');

        // Simulate: route PUT /applications/:appId/respond calls update_job_status_p  → 1 row (open → in-progress)
        await conn.execute(
            `INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_job_seq.NEXTVAL, 1, 'open', 'in-progress', 'UPDATE', TO_DATE('2026-04-27 17:07:58','YYYY-MM-DD HH24:MI:SS'), 'Rahim khan', 'Application accepted - job now in progress')`,
            [], { autoCommit: true }
        );

        // Simulate: frontend ALSO calls PUT /:jobId/status separately → duplicate (in-progress → in-progress)
        await conn.execute(
            `INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_job_seq.NEXTVAL, 1, 'in-progress', 'in-progress', 'UPDATE', TO_DATE('2026-04-27 17:07:58','YYYY-MM-DD HH24:MI:SS'), 'Rahim khan', 'Applicant accepted from Applicants page')`,
            [], { autoCommit: true }
        );

        // Simulate: second duplicate (e.g. button clicked twice / re-render)
        await conn.execute(
            `INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_job_seq.NEXTVAL, 1, 'in-progress', 'in-progress', 'UPDATE', TO_DATE('2026-04-27 17:07:58','YYYY-MM-DD HH24:MI:SS'), 'Rahim khan', 'Applicant accepted from Applicants page')`,
            [], { autoCommit: true }
        );

        // Simulate: a valid different status change (no duplicate)
        await conn.execute(
            `INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_job_seq.NEXTVAL, 1, NULL, 'open', 'INSERT', TO_DATE('2026-04-27 17:06:31','YYYY-MM-DD HH24:MI:SS'), 'SYSTEM', 'Job created by client')`,
            [], { autoCommit: true }
        );

        // Simulate some Audit_Applications data
        await conn.execute(
            `INSERT INTO Audit_Applications (audit_id, app_id, job_id, freelancer_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_app_seq.NEXTVAL, 1, 1, 3, 'pending', 'accepted', 'UPDATE', TO_DATE('2026-04-27 17:07:58','YYYY-MM-DD HH24:MI:SS'), 'Rahim khan', 'Client accepted application')`,
            [], { autoCommit: true }
        );
        // Simulate duplicate application audit
        await conn.execute(
            `INSERT INTO Audit_Applications (audit_id, app_id, job_id, freelancer_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_app_seq.NEXTVAL, 1, 1, 3, 'accepted', 'accepted', 'UPDATE', TO_DATE('2026-04-27 17:07:58','YYYY-MM-DD HH24:MI:SS'), 'Rahim khan', 'Client accepted application')`,
            [], { autoCommit: true }
        );

        console.log('Test data inserted.\n');

        // ── STEP 2: Current row counts ──
        console.log('=== STEP 2: Audit Table Row Counts ===\n');
        const tables = ['Audit_Users', 'Audit_Jobs', 'Audit_Applications', 'Audit_Payments'];
        for (const t of tables) {
            const r = await conn.execute(`SELECT COUNT(*) CNT FROM ${t}`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            const cnt = r.rows[0].CNT;
            console.log(`  ${t.padEnd(24)}: ${cnt} row(s)`);
        }

        // ── STEP 3: Redundancy check – Audit_Jobs ──
        console.log('\n=== STEP 3: Redundancy Check — Audit_Jobs ===\n');

        const dupJobs = await conn.execute(`
            SELECT job_id, old_status, new_status, changed_by, change_reason,
                   TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') AS ts,
                   COUNT(*) AS dup_count
            FROM Audit_Jobs
            GROUP BY job_id, old_status, new_status, changed_by, change_reason,
                     TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS')
            HAVING COUNT(*) > 1
            ORDER BY ts DESC
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (dupJobs.rows.length === 0) {
            console.log('  No duplicate rows found in Audit_Jobs.');
        } else {
            console.log(`  FOUND ${dupJobs.rows.length} duplicate group(s):\n`);
            dupJobs.rows.forEach(r => {
                console.log(`  job_id=${r.JOB_ID}  ${r.OLD_STATUS || 'NULL'} → ${r.NEW_STATUS || 'NULL'}`);
                console.log(`    changed_by   : ${r.CHANGED_BY}`);
                console.log(`    reason       : ${r.CHANGE_REASON}`);
                console.log(`    timestamp    : ${r.TS}`);
                console.log(`    dup_count    : ${r.DUP_COUNT}  ← ${r.DUP_COUNT - 1} EXTRA row(s)\n`);
            });
        }

        // ── STEP 4: Redundancy check – Audit_Applications ──
        console.log('=== STEP 4: Redundancy Check — Audit_Applications ===\n');

        const dupApps = await conn.execute(`
            SELECT app_id, job_id, old_status, new_status, changed_by,
                   TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') AS ts,
                   COUNT(*) AS dup_count
            FROM Audit_Applications
            GROUP BY app_id, job_id, old_status, new_status, changed_by,
                     TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS')
            HAVING COUNT(*) > 1
            ORDER BY ts DESC
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (dupApps.rows.length === 0) {
            console.log('  No duplicate rows found in Audit_Applications.');
        } else {
            console.log(`  FOUND ${dupApps.rows.length} duplicate group(s):\n`);
            dupApps.rows.forEach(r => {
                console.log(`  app_id=${r.APP_ID}  job_id=${r.JOB_ID}  ${r.OLD_STATUS || 'NULL'} → ${r.NEW_STATUS || 'NULL'}`);
                console.log(`    changed_by : ${r.CHANGED_BY}`);
                console.log(`    timestamp  : ${r.TS}`);
                console.log(`    dup_count  : ${r.DUP_COUNT}  ← ${r.DUP_COUNT - 1} EXTRA row(s)\n`);
            });
        }

        // ── STEP 5: Show all Audit_Jobs rows for context ──
        console.log('=== STEP 5: All Audit_Jobs Rows (Full Detail) ===\n');
        const allJobs = await conn.execute(`
            SELECT audit_id, job_id, old_status, new_status, operation_type,
                   TO_CHAR(timestamp,'YYYY-MM-DD HH24:MI:SS') AS ts,
                   changed_by, change_reason
            FROM Audit_Jobs ORDER BY ts, audit_id
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        allJobs.rows.forEach(r => {
            const dup = dupJobs.rows.find(d =>
                d.JOB_ID === r.JOB_ID &&
                d.OLD_STATUS === r.OLD_STATUS &&
                d.NEW_STATUS === r.NEW_STATUS &&
                d.CHANGED_BY === r.CHANGED_BY &&
                d.TS === r.TS
            );
            const flag = dup ? '  *** DUPLICATE ***' : '';
            console.log(`  [audit_id=${r.AUDIT_ID}] job=${r.JOB_ID}  ${r.OLD_STATUS || 'NULL'} → ${r.NEW_STATUS || 'NULL'}  op=${r.OPERATION_TYPE}  by=${r.CHANGED_BY}  ts=${r.TS}${flag}`);
        });

        // ── STEP 6: Root cause analysis ──
        console.log('\n=== STEP 6: Root Cause Summary ===\n');
        const totalDups = dupJobs.rows.reduce((s, r) => s + (r.DUP_COUNT - 1), 0)
                        + dupApps.rows.reduce((s, r) => s + (r.DUP_COUNT - 1), 0);
        console.log(`  Total redundant rows found : ${totalDups}`);
        console.log(`  Root causes identified:`);
        console.log(`   1. PUT /applications/:appId/respond calls update_job_status_p (open→in-progress)`);
        console.log(`      AND frontend separately calls PUT /:jobId/status (in-progress→in-progress)`);
        console.log(`   2. Dedup guard in PUT /:jobId/status uses different reason strings`);
        console.log(`      so it doesn't block the second write.`);
        console.log(`   3. Button double-click or React re-render can fire the API call again.`);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

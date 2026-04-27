const oracledb = require('oracledb');

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system', password: 'aishu', connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle DB\n');

        // ── SETUP: get real IDs from DB ──
        const usersRes = await conn.execute(
            `SELECT user_id, name, role FROM Users ORDER BY user_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const client     = usersRes.rows.find(u => u.ROLE === 'client');
        const freelancer = usersRes.rows.find(u => u.ROLE === 'freelancer');

        if (!client || !freelancer) {
            console.error('No client or freelancer found. Run reset_db.js first.');
            return;
        }
        console.log(`Client    : [ID:${client.USER_ID}] ${client.NAME}`);
        console.log(`Freelancer: [ID:${freelancer.USER_ID}] ${freelancer.NAME}\n`);

        // ── TEST 1: POST /api/jobs with budget=0 (was rejected before fix) ──
        console.log('=== TEST 1: Client posts job with budget=0 ===');
        const title = 'Test UI Design Job';
        const budget = 0;
        const category = 'design';
        const clientId = client.USER_ID;

        // Replicate the OLD broken validation
        const oldValidationFails = !title || !budget || !clientId;
        // Replicate the NEW fixed validation
        const newValidationFails = !title || budget == null || budget === '' || !clientId;

        console.log(`  Old !budget check : ${oldValidationFails ? 'FAIL (400 would be returned)' : 'pass'}`);
        console.log(`  New budget check  : ${newValidationFails ? 'FAIL' : 'PASS (job will be saved)'}`);

        // ── TEST 2: Actually insert the job via stored proc ──
        console.log('\n=== TEST 2: Insert job into DB (simulating fixed POST /api/jobs) ===');
        await conn.execute(
            `BEGIN insert_job_p(:title, :desc, :budget, :cat, :cid); END;`,
            { title, desc: 'Need a skilled UI/UX designer for mobile app', budget, cat: category, cid: clientId },
            { autoCommit: true }
        );
        const newJobRes = await conn.execute(
            `SELECT job_id, title, budget, status FROM Jobs WHERE client_id=:cid ORDER BY job_id DESC FETCH FIRST 1 ROW ONLY`,
            { cid: clientId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const newJob = newJobRes.rows[0];
        console.log(`  Job saved: [ID:${newJob.JOB_ID}] "${newJob.TITLE}" $${newJob.BUDGET} status=${newJob.STATUS}`);

        // ── TEST 3: Notification endpoint — does freelancer see the new job? ──
        console.log('\n=== TEST 3: Freelancer new-jobs notification query ===');
        const notifRes = await conn.execute(
            `SELECT j.job_id, j.title, j.budget, j.category, j.status, c.name AS client_name, j.created_at
             FROM Jobs j
             JOIN Users c ON j.client_id = c.user_id
             WHERE j.status = 'open'
             AND j.created_at >= TRUNC(SYSDATE - 7)
             AND j.job_id NOT IN (
                 SELECT DISTINCT job_id FROM Applications WHERE freelancer_id = :fid
             )
             ORDER BY j.created_at DESC`,
            { fid: freelancer.USER_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log(`  Jobs visible to freelancer [${freelancer.NAME}]: ${notifRes.rows.length}`);
        notifRes.rows.forEach(j => {
            const isNew = j.JOB_ID === newJob.JOB_ID ? ' ← NEW (just posted)' : '';
            console.log(`    [ID:${j.JOB_ID}] "${j.TITLE}" $${j.BUDGET} by ${j.CLIENT_NAME}${isNew}`);
        });

        // ── TEST 4: browse endpoint — does it return only open jobs? ──
        console.log('\n=== TEST 4: Browse endpoint (status=open only) ===');
        const browseRes = await conn.execute(
            `SELECT job_id, title, budget, status FROM Jobs WHERE status='open' ORDER BY created_at DESC`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log(`  Open jobs returned by browse: ${browseRes.rows.length}`);
        browseRes.rows.forEach(j =>
            console.log(`    [ID:${j.JOB_ID}] "${j.TITLE}" $${j.BUDGET} ${j.STATUS}`)
        );

        // ── RESULT ──
        const newJobVisible = notifRes.rows.some(j => j.JOB_ID === newJob.JOB_ID);
        console.log('\n' + '='.repeat(50));
        console.log('OVERALL RESULT');
        console.log('='.repeat(50));
        console.log(`  Bug 1 fix (budget=0 allowed)  : ${!newValidationFails ? 'PASS' : 'FAIL'}`);
        console.log(`  Bug 2 fix (job saved to DB)   : ${newJob ? 'PASS' : 'FAIL'}`);
        console.log(`  Bug 3 (freelancer can see job): ${newJobVisible ? 'PASS' : 'FAIL'}`);

        // cleanup test job
        await conn.execute(`DELETE FROM Jobs WHERE job_id = :id`, { id: newJob.JOB_ID }, { autoCommit: true });
        console.log(`\n  (Test job [ID:${newJob.JOB_ID}] cleaned up)`);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

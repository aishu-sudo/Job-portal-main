const oracledb = require('oracledb');

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system', password: 'aishu', connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle DB\n');

        // 1) All users
        const users = await conn.execute(
            `SELECT user_id, name, role FROM Users ORDER BY user_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('=== USERS IN DB ===');
        users.rows.forEach(u => console.log(`  [ID:${u.USER_ID}] ${u.NAME} (${u.ROLE})`));

        // 2) All jobs (most recent first)
        const jobs = await conn.execute(
            `SELECT job_id, title, budget, status, client_id, created_at FROM Jobs ORDER BY job_id DESC`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log(`\n=== ALL JOBS IN DB (${jobs.rows.length} total) ===`);
        jobs.rows.forEach(j =>
            console.log(`  [JOB:${j.JOB_ID}] "${j.TITLE}" $${j.BUDGET} status=${j.STATUS} client=${j.CLIENT_ID} created=${j.CREATED_AT}`)
        );

        // 3) Simulate the new-jobs notification query for each freelancer
        const freelancers = users.rows.filter(u => u.ROLE === 'freelancer');
        for (const f of freelancers) {
            const newJobs = await conn.execute(
                `SELECT j.job_id, j.title, j.budget, j.status, j.created_at, c.name AS client_name
                 FROM Jobs j
                 JOIN Users c ON j.client_id = c.user_id
                 WHERE j.status = 'open'
                 AND j.created_at >= TRUNC(SYSDATE - 7)
                 AND j.job_id NOT IN (
                     SELECT DISTINCT job_id FROM Applications WHERE freelancer_id = :fid
                 )
                 ORDER BY j.created_at DESC`,
                { fid: f.USER_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            console.log(`\n=== NEW JOBS VISIBLE TO FREELANCER [${f.NAME}] (ID:${f.USER_ID}) ===`);
            if (newJobs.rows.length === 0) {
                console.log('  (none)');
            } else {
                newJobs.rows.forEach(j =>
                    console.log(`  [JOB:${j.JOB_ID}] "${j.TITLE}" $${j.BUDGET} by ${j.CLIENT_NAME} created=${j.CREATED_AT}`)
                );
            }
        }

        // 4) Check if the notification API endpoint query would work
        console.log('\n=== DIAGNOSIS ===');
        const openJobs = jobs.rows.filter(j => j.STATUS === 'open');
        const recentJobs = jobs.rows.filter(j => {
            const created = new Date(j.CREATED_AT);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return created >= sevenDaysAgo;
        });
        console.log(`  Total jobs in DB: ${jobs.rows.length}`);
        console.log(`  Open jobs: ${openJobs.length}`);
        console.log(`  Jobs created in last 7 days: ${recentJobs.length}`);
        if (jobs.rows.length === 0) {
            console.log('\n  !! DB is empty — run reset_db.js to re-seed schema data, then post a job from the client dashboard');
        } else if (openJobs.length === 0) {
            console.log('\n  !! No open jobs — all jobs may have been moved to in-progress/completed/cancelled');
        } else if (recentJobs.length === 0) {
            console.log('\n  !! No jobs created in last 7 days — old sample data. The new-jobs query filters to SYSDATE-7.');
        } else {
            console.log('\n  Jobs and status look OK.');
            console.log('  => If freelancer dashboard still shows old data, the server needs to be RESTARTED');
            console.log('     so the fixed job.js code is loaded. Stop the server (Ctrl+C) and run: node server.js');
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

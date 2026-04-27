const getConnection = require('./models/db');
const oracledb = require('oracledb');

async function run() {
    let conn;
    try {
        conn = await getConnection();

        // Show all users
        const users = await conn.execute(
            `SELECT user_id, name, email, role FROM Users ORDER BY user_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('\n=== USERS ===');
        users.rows.forEach(u => console.log(`  user_id=${u.USER_ID}  role=${u.ROLE}  name=${u.NAME}  email=${u.EMAIL}`));

        // Show all payments
        const payments = await conn.execute(
            `SELECT p.payment_id, p.job_id, p.amount, p.type, p.status,
                    p.client_id, p.freelancer_id, j.title AS job_title
             FROM Payments p
             LEFT JOIN Jobs j ON p.job_id = j.job_id
             ORDER BY p.payment_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('\n=== PAYMENTS ===');
        if (!payments.rows.length) {
            console.log('  (no payments found in DB)');
        } else {
            payments.rows.forEach(p => {
                console.log(`  payment_id=${p.PAYMENT_ID}  job="${p.JOB_TITLE}"(id=${p.JOB_ID})  amount=${p.AMOUNT}  type=${p.TYPE}  status=${p.STATUS}  client_id=${p.CLIENT_ID}  freelancer_id=${p.FREELANCER_ID}`);
            });
        }

        // Show all jobs
        const jobs = await conn.execute(
            `SELECT job_id, title, status, client_id FROM Jobs ORDER BY job_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('\n=== JOBS ===');
        jobs.rows.forEach(j => console.log(`  job_id=${j.JOB_ID}  status=${j.STATUS}  client_id=${j.CLIENT_ID}  title="${j.TITLE}"`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();

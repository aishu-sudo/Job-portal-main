const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

// Oracle SQL parser: handles mixed DDL/DML (;-terminated) and PL/SQL blocks (/-terminated)
function parseStatements(sql) {
    const lines = sql.split('\n');
    const statements = [];
    let current = [];
    let inPLSQL = false;

    function flushRegular(block) {
        for (const chunk of block.split(';')) {
            const s = chunk.split('\n')
                .filter(l => !l.trim().startsWith('--'))
                .join('\n').trim();
            if (s) statements.push(s);
        }
    }

    for (const line of lines) {
        const trimmed = line.trim();

        // '/' on its own line terminates a PL/SQL block
        if (trimmed === '/') {
            const stmt = current.join('\n').trim();
            if (stmt) statements.push(stmt);
            current = [];
            inPLSQL = false;
            continue;
        }

        // Entering a PL/SQL block — flush accumulated regular SQL first
        if (!inPLSQL && /^CREATE\s+OR\s+REPLACE\s+(PROCEDURE|TRIGGER|FUNCTION|PACKAGE)/i.test(trimmed)) {
            flushRegular(current.join('\n'));
            current = [line];
            inPLSQL = true;
            continue;
        }

        current.push(line);
    }

    // Flush whatever remains after the last '/'
    const remaining = current.join('\n');
    if (inPLSQL) {
        if (remaining.trim()) statements.push(remaining.trim());
    } else {
        flushRegular(remaining);
    }

    return statements.filter(s => s && s.trim());
}

async function runFile(conn, filePath) {
    const label = path.basename(filePath);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = parseStatements(sql);
    let ok = 0, warned = 0;

    for (const stmt of statements) {
        if (stmt.toUpperCase().trim() === 'COMMIT') continue;
        try {
            await conn.execute(stmt);
            ok++;
        } catch (e) {
            warned++;
            console.warn(`  WARN (${label}): ${e.message.split('\n')[0]}`);
            console.warn(`         ${stmt.substring(0, 90).replace(/\n/g, ' ')}`);
        }
    }
    return { ok, warned };
}

async function main() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: 'system',
            password: 'aishu',
            connectString: 'localhost:1521/XEPDB1'
        });
        console.log('Connected to Oracle DB\n');

        const serverDir = __dirname;

        // ── STEP 1: DROP EVERYTHING ──
        console.log('STEP 1: Running drop_all.sql ...');
        const d = await runFile(conn, path.join(serverDir, 'drop_all.sql'));
        await conn.execute('COMMIT');
        console.log(`  OK: ${d.ok} statements, ${d.warned} warnings.\n`);

        // ── STEP 2: RECREATE SCHEMA + SAMPLE DATA ──
        console.log('STEP 2: Running schema.sql ...');
        const s = await runFile(conn, path.join(serverDir, 'schema.sql'));
        await conn.execute('COMMIT');
        console.log(`  OK: ${s.ok} statements, ${s.warned} warnings.\n`);

        // ── STEP 3: VERIFY ──
        console.log('STEP 3: Verification\n');
        const tables = [
            'Users', 'Jobs', 'Applications', 'Payments',
            'Audit_Users', 'Audit_Jobs', 'Audit_Applications', 'Audit_Payments'
        ];
        for (const t of tables) {
            const r = await conn.execute(
                `SELECT COUNT(*) CNT FROM ${t}`, [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            console.log(`  ${t.padEnd(24)}: ${r.rows[0].CNT} row(s)`);
        }

        console.log('\n  Jobs in DB:');
        const jobs = await conn.execute(
            `SELECT job_id, title, budget, status FROM Jobs ORDER BY job_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (jobs.rows.length === 0) {
            console.log('    (none)');
        } else {
            jobs.rows.forEach(j =>
                console.log(`    [ID:${j.JOB_ID}] ${j.TITLE}  $${j.BUDGET}  ${j.STATUS}`)
            );
        }

        console.log('\n  Users in DB:');
        const users = await conn.execute(
            `SELECT user_id, name, email, role FROM Users ORDER BY user_id`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        users.rows.forEach(u =>
            console.log(`    [ID:${u.USER_ID}] ${u.NAME}  ${u.EMAIL}  (${u.ROLE})`)
        );

        console.log('\n  DB reset complete — fresh sample data loaded.');

    } catch (e) {
        console.error('Fatal error:', e.message);
    } finally {
        if (conn) await conn.close();
    }
}

main();

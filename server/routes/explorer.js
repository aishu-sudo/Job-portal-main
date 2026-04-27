const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

// Whitelist: only these tables can be queried — maps display name → { table, orderBy }
const ALLOWED_TABLES = {
    'Users':              { table: 'Users',              orderBy: 'user_id DESC' },
    'Jobs':               { table: 'Jobs',               orderBy: 'job_id DESC' },
    'Applications':       { table: 'Applications',       orderBy: 'app_id DESC' },
    'Payments':           { table: 'Payments',           orderBy: 'payment_id DESC' },
    'Audit_Users':        { table: 'Audit_Users',        orderBy: 'audit_id DESC' },
    'Audit_Jobs':         { table: 'Audit_Jobs',         orderBy: 'audit_id DESC' },
    'Audit_Applications': { table: 'Audit_Applications', orderBy: 'audit_id DESC' },
    'Audit_Payments':     { table: 'Audit_Payments',     orderBy: 'audit_id DESC' },
};

// GET /api/explorer/tables — return list of available tables
router.get('/tables', (req, res) => {
    res.json({ tables: Object.keys(ALLOWED_TABLES) });
});

// GET /api/explorer/:tableName — return columns + rows for a table
router.get('/:tableName', async (req, res) => {
    const entry = ALLOWED_TABLES[req.params.tableName];
    if (!entry) {
        return res.status(400).json({ error: 'Table not allowed' });
    }

    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT * FROM ${entry.table} ORDER BY ${entry.orderBy} FETCH FIRST 100 ROWS ONLY`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const columns = (result.metaData || []).map(m => m.name.toLowerCase());
        const rows = (result.rows || []).map(row => {
            const obj = {};
            columns.forEach(col => {
                const val = row[col.toUpperCase()];
                obj[col] = val === null || val === undefined ? 'null' : val;
            });
            return obj;
        });

        res.json({ table: entry.table, columns, rows, total: rows.length });
    } catch (error) {
        console.error('Explorer error:', error.message);
        res.status(500).json({ error: 'Failed to fetch table data', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;

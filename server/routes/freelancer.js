const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const getConnection = require('../models/db');

const dataDir = path.join(__dirname, '..', 'data');

function mapFreelancer(row) {
    return { id: row.USER_ID, name: row.NAME, email: row.EMAIL, role: row.ROLE };
}

// GET /api/freelancers
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT user_id, name, email, role FROM Users WHERE role = 'freelancer'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return res.json(result.rows.map(mapFreelancer));
    } catch (error) {
        // Fallback to JSON file
        try {
            const content = await fs.readFile(path.join(dataDir, 'freelancers.json'), 'utf8');
            const list = JSON.parse(content) || [];
            return res.json(list.map(f => ({ id: f.id, name: f.name, email: f.email, role: f.role })));
        } catch (e) {
            return res.json([]);
        }
    } finally {
        if (conn) await conn.close();
    }
});

// GET /api/freelancers/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT user_id, name, email, role FROM Users WHERE user_id = :id AND role = 'freelancer'`,
            { id: Number(id) },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }
        return res.json(mapFreelancer(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch freelancer', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;

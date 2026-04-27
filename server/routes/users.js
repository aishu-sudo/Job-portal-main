const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

// GET /api/users — list all users
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT user_id, name, email, role, created_at FROM Users ORDER BY user_id ASC`,
            [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows.map(u => ({
            userId:    u.USER_ID,
            name:      u.NAME,
            email:     u.EMAIL,
            role:      u.ROLE,
            createdAt: u.CREATED_AT
        })));
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users', details: e.message });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /api/users/:userId/role — change role + write to Audit_Users
router.put('/:userId/role', async (req, res) => {
    const { userId } = req.params;
    const { newRole, changedBy } = req.body;

    if (!newRole || !['client', 'freelancer', 'admin'].includes(newRole)) {
        return res.status(400).json({ error: 'newRole must be client, freelancer, or admin' });
    }

    let conn;
    try {
        conn = await getConnection();

        // Get current role
        const current = await conn.execute(
            `SELECT role, name FROM Users WHERE user_id = :id`,
            { id: Number(userId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (!current.rows.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        const oldRole = current.rows[0].ROLE;
        const userName = current.rows[0].NAME;

        if (oldRole === newRole) {
            return res.json({ message: 'Role unchanged', userId, role: newRole });
        }

        // Update role in Users table
        await conn.execute(
            `UPDATE Users SET role = :newRole WHERE user_id = :id`,
            { newRole, id: Number(userId) }, { autoCommit: false }
        );

        // Write to Audit_Users
        await conn.execute(
            `INSERT INTO Audit_Users (audit_id, user_id, old_role, new_role, operation_type, timestamp, changed_by, change_reason)
             VALUES (audit_user_seq.NEXTVAL, :userId, :oldRole, :newRole, 'UPDATE', SYSDATE, :changedBy, 'Role changed by admin')`,
            {
                userId:    Number(userId),
                oldRole,
                newRole,
                changedBy: changedBy || 'ADMIN'
            }, { autoCommit: true }
        );

        res.json({ message: 'Role updated', userId, name: userName, oldRole, newRole });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update role', details: e.message });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;

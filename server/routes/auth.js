const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
const getConnection = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'jobportal_secret_2024';
const dataDir = path.join(__dirname, '..', 'data');
const roleFileMap = { client: 'clients.json', freelancer: 'freelancers.json' };

async function readRoleFile(role) {
    const filePath = path.join(dataDir, roleFileMap[role] || 'users.json');
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content) || [];
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
}

async function saveUserToRoleFile({ name, email, role, passwordHash }) {
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, roleFileMap[role] || 'users.json');
    const users = await readRoleFile(role);
    if (users.find(u => u.email === email)) throw new Error('Email already registered');
    const newUser = {
        id: Date.now(),
        name,
        email,
        role,
        password: passwordHash,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf8');
    return newUser;
}

async function findUserInFiles(email) {
    for (const filename of Object.values(roleFileMap)) {
        const filePath = path.join(dataDir, filename);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const users = JSON.parse(content) || [];
            const user = users.find(u => u.email === email);
            if (user) return user;
        } catch (err) { /* file doesn't exist, skip */ }
    }
    return null;
}

async function verifyPassword(plain, stored) {
    if (!stored) return false;
    if (stored.startsWith('$2')) return bcrypt.compare(plain, stored);
    return plain === stored;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['client', 'freelancer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let conn;
    let dbUserId = null;
    let dbError = null;

    try {
        conn = await getConnection();
        await conn.execute(
            `BEGIN insert_user_p(:name, :email, :role, :password); END;`,
            { name, email, role, password: passwordHash },
            { autoCommit: true }
        );
        const result = await conn.execute(
            `SELECT user_id FROM Users WHERE email = :email`,
            { email },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows && result.rows.length > 0) {
            dbUserId = result.rows[0].USER_ID;
        }
    } catch (err) {
        dbError = err;
        console.error('Signup DB error:', err.message);
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }

    let savedUser;
    try {
        savedUser = await saveUserToRoleFile({ name, email, role, passwordHash });
    } catch (err) {
        if (err.message === 'Email already registered') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        console.error('Signup file save error:', err);
        return res.status(500).json({ error: 'Could not save user' });
    }

    const userId = dbUserId || savedUser.id;
    const token = jwt.sign({ userId, name, email, role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
        message: dbError ? 'User saved locally (DB unavailable)' : 'User registered successfully',
        token,
        user: { id: userId, name, email, role }
    });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    let conn;
    let dbUser = null;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT user_id, name, email, role, password FROM Users WHERE email = :email`,
            { email },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows && result.rows.length > 0) dbUser = result.rows[0];
    } catch (err) {
        console.error('Login DB error:', err.message);
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }

    if (dbUser) {
        const match = await verifyPassword(password, dbUser.PASSWORD);
        if (!match) return res.status(401).json({ error: 'Invalid email or password' });
        const token = jwt.sign(
            { userId: dbUser.USER_ID, name: dbUser.NAME, email: dbUser.EMAIL, role: dbUser.ROLE },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        return res.json({ token, user: { id: dbUser.USER_ID, name: dbUser.NAME, email: dbUser.EMAIL, role: dbUser.ROLE } });
    }

    // Fallback: check JSON files
    const fileUser = await findUserInFiles(email);
    if (!fileUser) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await verifyPassword(password, fileUser.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
        { userId: fileUser.id, name: fileUser.name, email: fileUser.email, role: fileUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.json({ token, user: { id: fileUser.id, name: fileUser.name, email: fileUser.email, role: fileUser.role } });
});

module.exports = router;

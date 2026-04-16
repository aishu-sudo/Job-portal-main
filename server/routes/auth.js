const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const getConnection = require('../models/db');

const dataDir = path.join(__dirname, '..', 'data');
const roleFileMap = {
    client: 'clients.json',
    freelancer: 'freelancers.json'
};

async function saveUserToRoleFile({ name, email, role }) {
    await fs.mkdir(dataDir, { recursive: true });

    const filename = roleFileMap[role] || 'users.json';
    const filePath = path.join(dataDir, filename);
    let users = [];

    try {
        const existing = await fs.readFile(filePath, 'utf8');
        users = JSON.parse(existing) || [];
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }

    users.push({
        name,
        email,
        role,
        createdAt: new Date().toISOString()
    });

    await fs.writeFile(filePath, JSON.stringify(users, null, 2), 'utf8');
}

router.post('/signup', async(req, res) => {
    const { name, email, role, password } = req.body;
    let conn;
    let dbError = null;

    try {
        conn = await getConnection();

        await conn.execute(
            `BEGIN
                insert_user_p(
                    :name,
                    :email,
                    :role,
                    :password
                );
             END;`, { name, email, role, password }, { autoCommit: true }
        );
    } catch (err) {
        dbError = err;
        console.error('Signup DB error:', err);
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (closeErr) {
                console.error('Failed to close DB connection', closeErr);
            }
        }
    }

    try {
        await saveUserToRoleFile({ name, email, role });
    } catch (err) {
        console.error('Signup file save error:', err);
        return res.status(500).send('Could not save signup file: ' + err.message);
    }

    if (dbError) {
        return res.status(200).send('User saved locally. Database unavailable: ' + dbError.message);
    }

    res.send('User registered successfully');
});

module.exports = router;
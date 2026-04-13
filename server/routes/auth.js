const express = require('express');
const router = express.Router();
const getConnection = require('../models/db');

router.post('/signup', async(req, res) => {
    const { name, email, role, password } = req.body;

    try {
        const conn = await getConnection();

        await conn.execute(
            `INSERT INTO Users (user_id, name, email, role, password)
             VALUES (users_seq.NEXTVAL, :name, :email, :role, :password)`, { name, email, role, password }, { autoCommit: true }
        );

        res.send("User registered successfully");

        await conn.close();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
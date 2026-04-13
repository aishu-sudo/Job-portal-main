const express = require('express');
const jobRoutes = require('./routes/job');
const paymentRoutes = require('./routes/payment');
const path = require('path');
const getConnection = require('./models/db');

const app = express();
const shouldTestDbOnStartup = process.env.DB_CHECK_ON_STARTUP === 'true';

app.use(express.json());
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);

// Serve static files
app.use(express.static(__dirname));
app.use(express.static('client'));

// Route for serving freelancerDashboard.html
app.get('/freelancerDashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'freelancerDashboard.html'));
});


//  TEST DATABASE CONNECTION 
async function testDB() {
    let conn;
    try {
        conn = await getConnection();
        await conn.execute('SELECT 1 FROM DUAL');

        console.log("DB Connected ✅");
    } catch (err) {
        if (err.code === 'NJS-503') {
            console.error('DB Error ❌ Oracle listener is unreachable. Set ORACLE_DB_CONNECT_STRING (or ORACLE_DB_HOST/PORT/SERVICE) to a running instance.');
            return;
        }
        console.error("DB Error ❌", err);
    } finally {
        if (conn) {
            await conn.close();
        }
    }
}

if (shouldTestDbOnStartup) {
    testDB();
}

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
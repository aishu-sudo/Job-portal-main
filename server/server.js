const express = require('express');
const cors = require('cors');
const path = require('path');
const getConnection = require('./models/db');

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/job');
const paymentRoutes = require('./routes/payment');
const freelancerRoutes = require('./routes/freelancer');

const app = express();
const shouldTestDbOnStartup = process.env.DB_CHECK_ON_STARTUP === 'true';

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === 'null') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());
app.use((req, res, next) => {
    console.log("Incoming:", req.method, req.url);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/freelancers', freelancerRoutes);

// Serve client static files
const clientPublicPath = path.resolve(__dirname, '..', 'client', 'public');
console.log('Serving static files from:', clientPublicPath);
app.use(express.static(clientPublicPath));

async function testDB() {
    let conn;
    try {
        conn = await getConnection();
        await conn.execute('SELECT 1 FROM DUAL');
        console.log("DB Connected");
    } catch (err) {
        if (err.code === 'NJS-503') {
            console.warn('Oracle listener unreachable — running without DB. Set ORACLE_DB_CONNECT_STRING to connect.');
            return;
        }
        console.error("DB Error", err.message);
    } finally {
        if (conn) { try { await conn.close(); } catch (e) {} }
    }
}

if (shouldTestDbOnStartup) {
    testDB();
}

app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});

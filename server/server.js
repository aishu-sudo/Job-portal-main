const express = require('express');
const jobRoutes = require('./routes/job');
const paymentRoutes = require('./routes/payment');
const path = require('path');
const getConnection = require('./models/db');

const app = express();

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
    try {
        const conn = await getConnection();
        const result = await conn.execute("SELECT * FROM Users");

        console.log("DB Connected ✅");
        console.log(result.rows);

        await conn.close();
    } catch (err) {
        console.error("DB Error ❌", err);
    }
}

testDB();


// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
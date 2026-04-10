const express = require('express');
const jobRoutes = require('./routes/job');
const paymentRoutes = require('./routes/payment');
const path = require('path');

const app = express();

app.use(express.json());
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);

app.use(express.static(__dirname));
app.use(express.static('client'));

app.get('/freelancerDashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'freelancerDashboard.html'));
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});
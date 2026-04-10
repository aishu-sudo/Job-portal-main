const express = require('express');
const jobRoutes = require('./routes/job');
const paymentRoutes = require('./routes/payment');
const path = require('path'); // Import path for resolving file locations
const app = express();

app.use(express.json());
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);

// Serve static files (HTML, CSS, JS) from the root and public folder
app.use(express.static(__dirname));
app.use(express.static('client'));

// Route for serving freelancerDashboard.html
app.get('/freelancerDashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'freelancerDashboard.html'));
});



// Start the server
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
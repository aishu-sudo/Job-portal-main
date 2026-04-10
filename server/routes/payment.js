const express = require('express');
const router = express.Router();
const Payment = require('../models/payment');

// Create a new client payment
router.post('/client', async(req, res) => {
    try {
        const payment = await Payment.createClientPayment(req.body);
        res.status(201).json(payment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Create a new freelancer payout
router.post('/payout', async(req, res) => {
    try {
        const payout = await Payment.createFreelancerPayout(req.body);
        res.status(201).json(payout);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all payments for a client
router.get('/client/:clientId', async(req, res) => {
    try {
        const payments = await Payment.find({
            clientId: req.params.clientId,
            type: 'client_payment'
        }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all payouts for a freelancer
router.get('/freelancer/:freelancerId', async(req, res) => {
    try {
        const payouts = await Payment.find({
            freelancerId: req.params.freelancerId,
            type: 'freelancer_payout'
        }).sort({ createdAt: -1 });
        res.json(payouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update payment status
router.patch('/:paymentId/status', async(req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        const updatedPayment = await payment.updateStatus(req.body.status, req.body.errorMessage);
        res.json(updatedPayment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update payout status
router.patch('/:paymentId/payout-status', async(req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        const updatedPayment = await payment.updatePayoutStatus(req.body.status, req.body.transactionId);
        res.json(updatedPayment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
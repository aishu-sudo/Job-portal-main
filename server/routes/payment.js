const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

function mapPaymentRow(row) {
    return {
        paymentId: row.PAYMENT_ID,
        jobId: row.JOB_ID,
        amount: row.AMOUNT,
        paymentDate: row.PAYMENT_DATE,
        type: row.TYPE,
        status: row.STATUS,
        clientId: row.CLIENT_ID,
        freelancerId: row.FREELANCER_ID,
        transactionId: row.TRANSACTION_ID,
        errorMessage: row.ERROR_MESSAGE
    };
}

// Create a new client payment
router.post('/client', async(req, res) => {
    const { jobId, amount, clientId } = req.body;
    let conn;

    if (!jobId || amount == null || !clientId) {
        return res.status(400).json({ message: 'jobId, amount, and clientId are required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `INSERT INTO Payments (payment_id, job_id, amount, type, status, client_id)
             VALUES (payment_seq.NEXTVAL, :jobId, :amount, 'client_payment', 'pending', :clientId)`, { jobId, amount, clientId }, { autoCommit: true }
        );

        res.status(201).json({ message: 'Client payment created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Create a new freelancer payout
router.post('/payout', async(req, res) => {
    const { jobId, amount, freelancerId } = req.body;
    let conn;

    if (!jobId || amount == null || !freelancerId) {
        return res.status(400).json({ message: 'jobId, amount, and freelancerId are required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `INSERT INTO Payments (payment_id, job_id, amount, type, status, freelancer_id)
             VALUES (payment_seq.NEXTVAL, :jobId, :amount, 'freelancer_payout', 'pending', :freelancerId)`, { jobId, amount, freelancerId }, { autoCommit: true }
        );

        res.status(201).json({ message: 'Freelancer payout created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Get all payments for a client
router.get('/client/:clientId', async(req, res) => {
    const { clientId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT payment_id, job_id, amount, payment_date, type, status, client_id, freelancer_id, transaction_id, error_message
             FROM Payments
             WHERE client_id = :clientId AND type = 'client_payment'
             ORDER BY payment_date DESC`, { clientId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapPaymentRow));
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Get all payouts for a freelancer
router.get('/freelancer/:freelancerId', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT payment_id, job_id, amount, payment_date, type, status, client_id, freelancer_id, transaction_id, error_message
             FROM Payments
             WHERE freelancer_id = :freelancerId AND type = 'freelancer_payout'
             ORDER BY payment_date DESC`, { freelancerId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapPaymentRow));
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Update payment status
router.patch('/:paymentId/status', async(req, res) => {
    const { paymentId } = req.params;
    const { status, errorMessage } = req.body;
    let conn;

    if (!status) {
        return res.status(400).json({ message: 'status is required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `UPDATE Payments
             SET status = :status, error_message = :errorMessage
             WHERE payment_id = :paymentId`, { status, errorMessage, paymentId }, { autoCommit: true }
        );

        res.json({ message: 'Payment status updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Update payout status
router.patch('/:paymentId/payout-status', async(req, res) => {
    const { paymentId } = req.params;
    const { status, transactionId } = req.body;
    let conn;

    if (!status) {
        return res.status(400).json({ message: 'status is required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `UPDATE Payments
             SET status = :status, transaction_id = :transactionId
             WHERE payment_id = :paymentId`, { status, transactionId, paymentId }, { autoCommit: true }
        );

        res.json({ message: 'Payout status updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;
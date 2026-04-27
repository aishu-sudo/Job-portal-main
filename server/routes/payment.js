const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

// DELETE /api/payments/:paymentId — permanently delete a payment
router.delete('/:paymentId', async(req, res) => {
    const { paymentId } = req.params;
    let conn;
    try {
        conn = await getConnection();
        await conn.execute(
            'DELETE FROM Payments WHERE payment_id = :paymentId', { paymentId: Number(paymentId) }, { autoCommit: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete payment', details: e.message });
    } finally {
        if (conn) await conn.close();
    }
});

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
// ...existing code...

module.exports = router;

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

// Get all payments for a freelancer (both client_payment and freelancer_payout)
router.get('/freelancer/:freelancerId', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT p.payment_id, p.job_id, p.amount, p.payment_date, p.type, p.status,
                    p.client_id, p.freelancer_id, p.transaction_id, p.error_message, p.created_at,
                    j.title AS job_title
             FROM Payments p
             LEFT JOIN Jobs j ON p.job_id = j.job_id
             WHERE p.freelancer_id = :freelancerId
             ORDER BY p.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(row => ({
            paymentId: row.PAYMENT_ID,
            jobId: row.JOB_ID,
            jobTitle: row.JOB_TITLE || `Job #${row.JOB_ID}`,
            amount: row.AMOUNT,
            paymentDate: row.PAYMENT_DATE,
            type: row.TYPE,
            status: row.STATUS,
            clientId: row.CLIENT_ID,
            freelancerId: row.FREELANCER_ID,
            transactionId: row.TRANSACTION_ID,
            errorMessage: row.ERROR_MESSAGE,
            createdAt: row.CREATED_AT
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Update payment status — uses stored procedure so Audit_Payments is written
router.patch('/:paymentId/status', async(req, res) => {
    const { paymentId } = req.params;
    const { status, changedBy, reason } = req.body;
    let conn;

    if (!status) {
        return res.status(400).json({ message: 'status is required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `BEGIN update_payment_status_p(:paymentId, :status, :changedBy, :reason); END;`, {
                paymentId: Number(paymentId),
                status,
                changedBy: changedBy || 'FREELANCER',
                reason: reason || 'Payment status updated'
            }, { autoCommit: true }
        );
        res.json({ message: 'Payment status updated', paymentId, newStatus: status });
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
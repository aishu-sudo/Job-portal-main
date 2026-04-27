const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

// ========================================
// 🔔 FREELANCER NOTIFICATIONS ENDPOINTS
// ========================================

/**
 * GET /api/notifications/freelancer/:freelancerId
 * Get all notifications for a freelancer
 */
router.get('/freelancer/:freelancerId', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();

        // Get notifications from applications
        const applicationsResult = await conn.execute(
            `SELECT 
                'Application Update' AS notification_type,
                a.app_id AS related_id,
                j.title AS job_title,
                a.status,
                a.created_at AS created_at
             FROM Applications a
             JOIN Jobs j ON a.job_id = j.job_id
             WHERE a.freelancer_id = :freelancerId
             ORDER BY a.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Get job status change notifications
        const jobsResult = await conn.execute(
            `SELECT 
                'Job Update' AS notification_type,
                j.job_id AS related_id,
                j.title AS job_title,
                j.status,
                j.created_at AS created_at
             FROM Jobs j
             WHERE j.job_id IN (
                SELECT DISTINCT a.job_id 
                FROM Applications a 
                WHERE a.freelancer_id = :freelancerId
             )
             ORDER BY j.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Get payment notifications
        const paymentsResult = await conn.execute(
            `SELECT 
                'Payment Notification' AS notification_type,
                p.payment_id AS related_id,
                j.title AS job_title,
                p.status,
                p.created_at AS created_at
             FROM Payments p
             JOIN Jobs j ON p.job_id = j.job_id
             WHERE p.freelancer_id = :freelancerId
             ORDER BY p.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Get new job postings notifications
        const newJobsResult = await conn.execute(
            `SELECT 
                'New Job Posting' AS notification_type,
                j.job_id AS related_id,
                j.title AS job_title,
                j.budget,
                j.category,
                j.created_at AS created_at
             FROM Jobs j
             WHERE j.status = 'open'
             AND j.created_at >= TRUNC(SYSDATE - 7)
             AND j.job_id NOT IN (
                SELECT DISTINCT job_id 
                FROM Applications 
                WHERE freelancer_id = :freelancerId
             )
             ORDER BY j.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const notifications = [
            ...applicationsResult.rows.map(n => ({
                type: 'Application',
                relatedId: n.RELATED_ID,
                jobTitle: n.JOB_TITLE,
                message: `Application status: ${n.STATUS}`,
                timestamp: n.CREATED_AT,
                icon: '📋'
            })),
            ...jobsResult.rows.map(n => ({
                type: 'Job Update',
                relatedId: n.RELATED_ID,
                jobTitle: n.JOB_TITLE,
                message: `Job status changed to: ${n.STATUS}`,
                timestamp: n.CREATED_AT,
                icon: '🔄'
            })),
            ...paymentsResult.rows.map(n => ({
                type: 'Payment',
                relatedId: n.RELATED_ID,
                jobTitle: n.JOB_TITLE,
                message: `Payment ${n.STATUS}`,
                timestamp: n.CREATED_AT,
                icon: '💰'
            })),
            ...newJobsResult.rows.map(n => ({
                type: 'New Job',
                relatedId: n.RELATED_ID,
                jobTitle: n.JOB_TITLE,
                message: `New ${n.CATEGORY} job posted - $${n.BUDGET}`,
                timestamp: n.CREATED_AT,
                icon: '🆕'
            }))
        ];

        // Sort by timestamp
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            freelancerId: Number(freelancerId),
            totalNotifications: notifications.length,
            notifications: notifications.slice(0, 50) // Last 50
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch notifications',
            details: error.message
        });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * GET /api/notifications/freelancer/:freelancerId/unread
 * Get unread notifications count (applications pending)
 */
router.get('/freelancer/:freelancerId/unread', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();

        const result = await conn.execute(
            `SELECT COUNT(*) as unread_count
             FROM Applications 
             WHERE freelancer_id = :freelancerId 
             AND status = 'pending'`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const unreadCount = (result.rows[0] && result.rows[0].UNREAD_COUNT) || 0;

        res.json({
            freelancerId: Number(freelancerId),
            unreadNotifications: unreadCount
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch unread count',
            details: error.message
        });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * GET /api/notifications/freelancer/:freelancerId/applications
 * Get all application notifications
 */
router.get('/freelancer/:freelancerId/applications', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();

        const result = await conn.execute(
            `SELECT 
                a.app_id,
                a.job_id,
                j.title,
                j.budget,
                j.status as job_status,
                a.status as application_status,
                a.bid_amount,
                a.proposal,
                c.name as client_name,
                a.created_at
             FROM Applications a
             JOIN Jobs j ON a.job_id = j.job_id
             JOIN Users c ON j.client_id = c.user_id
             WHERE a.freelancer_id = :freelancerId
             ORDER BY a.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const applications = result.rows.map(app => ({
            applicationId: app.APP_ID,
            jobId: app.JOB_ID,
            jobTitle: app.TITLE,
            budget: app.BUDGET,
            jobStatus: app.JOB_STATUS,
            applicationStatus: app.APPLICATION_STATUS,
            bidAmount: app.BID_AMOUNT,
            proposal: app.PROPOSAL,
            clientName: app.CLIENT_NAME,
            appliedDate: app.CREATED_AT,
            message: `${app.APPLICATION_STATUS === 'accepted' ? '✅ Accepted' : app.APPLICATION_STATUS === 'rejected' ? '❌ Rejected' : '⏳ Pending'}: ${app.TITLE} - ${app.CLIENT_NAME}`
        }));

        res.json({
            freelancerId: Number(freelancerId),
            totalApplications: applications.length,
            applications
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch applications',
            details: error.message
        });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * GET /api/notifications/freelancer/:freelancerId/payments
 * Get payment notifications
 */
router.get('/freelancer/:freelancerId/payments', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();

        const result = await conn.execute(
            `SELECT 
                p.payment_id,
                p.job_id,
                j.title,
                p.amount,
                p.type,
                p.status,
                p.transaction_id,
                p.error_message,
                p.created_at
             FROM Payments p
             JOIN Jobs j ON p.job_id = j.job_id
             WHERE p.freelancer_id = :freelancerId
             ORDER BY p.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const payments = result.rows.map(payment => ({
            paymentId: payment.PAYMENT_ID,
            jobId: payment.JOB_ID,
            jobTitle: payment.TITLE,
            amount: payment.AMOUNT,
            type: payment.TYPE,
            status: payment.STATUS,
            transactionId: payment.TRANSACTION_ID,
            errorMessage: payment.ERROR_MESSAGE,
            createdDate: payment.CREATED_AT,
            message: `Payment ${payment.STATUS}: $${payment.AMOUNT} for ${payment.TITLE}`,
            icon: payment.STATUS === 'completed' ? '✅' : payment.STATUS === 'failed' ? '❌' : '⏳'
        }));

        res.json({
            freelancerId: Number(freelancerId),
            totalPayments: payments.length,
            payments
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch payments',
            details: error.message
        });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * GET /api/notifications/freelancer/:freelancerId/jobs-status
 * Get notifications about job status changes
 */
router.get('/freelancer/:freelancerId/jobs-status', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        conn = await getConnection();

        const result = await conn.execute(
            `SELECT DISTINCT
                j.job_id,
                j.title,
                j.status,
                j.budget,
                j.category,
                c.name as client_name,
                j.created_at,
                COUNT(*) OVER (PARTITION BY j.job_id) as total_applicants
             FROM Jobs j
             JOIN Users c ON j.client_id = c.user_id
             JOIN Applications a ON j.job_id = a.job_id
             WHERE a.freelancer_id = :freelancerId
             ORDER BY j.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const jobUpdates = result.rows.map(job => ({
            jobId: job.JOB_ID,
            title: job.TITLE,
            status: job.STATUS,
            budget: job.BUDGET,
            category: job.CATEGORY,
            clientName: job.CLIENT_NAME,
            createdDate: job.CREATED_AT,
            totalApplicants: job.TOTAL_APPLICANTS,
            message: `Job "${job.TITLE}" is now ${job.STATUS}`,
            icon: job.STATUS === 'open' ? '🔓' : job.STATUS === 'in-progress' ? '⚙️' : job.STATUS === 'completed' ? '✅' : '❌'
        }));

        res.json({
            freelancerId: Number(freelancerId),
            jobStatusUpdates: jobUpdates
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch job status updates',
            details: error.message
        });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * GET /api/notifications/freelancer/:freelancerId/new-jobs
 * Get new job postings as notifications (jobs posted in last 7 days that user hasn't applied to)
 */
router.get('/freelancer/:freelancerId/new-jobs', async(req, res) => {
    const { freelancerId } = req.params;
    let conn;

    try {
        console.log(`📥 Fetching new jobs for freelancer: ${freelancerId}`);
        conn = await getConnection();

        // Get new jobs posted in last 7 days that freelancer hasn't applied to
        const result = await conn.execute(
            `SELECT 
                j.job_id,
                j.title,
                j.description,
                j.budget,
                j.category,
                j.status,
                c.name as client_name,
                j.created_at
             FROM Jobs j
             JOIN Users c ON j.client_id = c.user_id
             WHERE j.status = 'open'
             AND j.created_at >= TRUNC(SYSDATE - 7)
             AND j.job_id NOT IN (
                SELECT DISTINCT job_id 
                FROM Applications 
                WHERE freelancer_id = :freelancerId
             )
             ORDER BY j.created_at DESC`, { freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const newJobs = result.rows.map(job => ({
            jobId: job.JOB_ID,
            title: job.TITLE,
            description: job.DESCRIPTION,
            budget: job.BUDGET,
            category: job.CATEGORY,
            status: job.STATUS,
            clientName: job.CLIENT_NAME,
            postedDate: job.CREATED_AT,
            message: `New ${job.CATEGORY} job: "${job.TITLE}" by ${job.CLIENT_NAME} - $${job.BUDGET}`,
            icon: '🆕'
        }));

        // Debug logging
        console.log('DEBUG newJobs raw rows:', result.rows);
        console.log('DEBUG mapped newJobs:', newJobs);
        console.log(`✅ Found ${newJobs.length} new jobs for freelancer ${freelancerId}`);

        res.json({
            freelancerId: Number(freelancerId),
            totalNewJobs: newJobs.length,
            newJobs: newJobs.slice(0, 10) // Last 10 new jobs
        });

    } catch (error) {
        console.error('❌ Error fetching new job notifications:', error.message);
        res.status(500).json({
            error: 'Failed to fetch new job notifications',
            details: error.message
        });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * GET /api/notifications/admin
 * Admin notification feed: who applied (FREELANCER) + who accepted/rejected (CLIENT)
 */
router.get('/admin', async(req, res) => {
    let conn;
    try {
        conn = await getConnection();

        const result = await conn.execute(
            `SELECT
                a.app_id,
                j.title        AS job_title,
                a.status       AS app_status,
                f.name         AS freelancer_name,
                c.name         AS client_name,
                a.created_at
             FROM Applications a
             JOIN Jobs j  ON a.job_id      = j.job_id
             JOIN Users f ON a.freelancer_id = f.user_id
             JOIN Users c ON j.client_id   = c.user_id
             ORDER BY a.created_at DESC
             FETCH FIRST 100 ROWS ONLY`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const notifications = [];

        result.rows.forEach(row => {
            // Every application → FREELANCER notification
            notifications.push({
                id: `apply-${row.APP_ID}`,
                title: 'New Application Received',
                message: `${row.FREELANCER_NAME} has applied to "${row.JOB_TITLE}"`,
                badge: 'FREELANCER',
                time: row.CREATED_AT,
                appStatus: row.APP_STATUS
            });

            // Accepted → CLIENT notification
            if (row.APP_STATUS === 'accepted') {
                notifications.push({
                    id: `accept-${row.APP_ID}`,
                    title: 'Application Accepted',
                    message: `${row.CLIENT_NAME} accepted ${row.FREELANCER_NAME} for "${row.JOB_TITLE}"`,
                    badge: 'CLIENT',
                    time: row.CREATED_AT,
                    appStatus: row.APP_STATUS
                });
            }

            // Rejected → CLIENT notification
            if (row.APP_STATUS === 'rejected') {
                notifications.push({
                    id: `reject-${row.APP_ID}`,
                    title: 'Application Rejected',
                    message: `${row.CLIENT_NAME} rejected ${row.FREELANCER_NAME} for "${row.JOB_TITLE}"`,
                    badge: 'CLIENT',
                    time: row.CREATED_AT,
                    appStatus: row.APP_STATUS
                });
            }
        });

        notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({ totalNotifications: notifications.length, notifications });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin notifications', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

/**
 * POST /api/notifications/send
 * Send notification (for system use)
 */
router.post('/send', async(req, res) => {
    const { freelancerId, type, title, message } = req.body;

    if (!freelancerId || !type || !message) {
        return res.status(400).json({
            error: 'freelancerId, type, and message are required'
        });
    }

    // In a real system, you would save to database or send email
    // For now, just acknowledge
    res.json({
        status: 'success',
        message: 'Notification would be sent to freelancer',
        notification: {
            freelancerId,
            type,
            title: title || 'Notification',
            message,
            timestamp: new Date().toISOString()
        }
    });
});

module.exports = router;
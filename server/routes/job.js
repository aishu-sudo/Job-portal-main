const express = require('express');
const router = express.Router();
const Job = require('../models/Job.js');
const Application = require('../models/Application');

// 1️ Browse All Jobs
router.get('/browse', async(req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// 2️ Apply for a Job
router.post('/:jobId/apply', async(req, res) => {
    const { freelancerId, proposalText, bidAmount } = req.body;
    const { jobId } = req.params;

    try {
        const application = new Application({
            jobId,
            freelancerId,
            proposalText,
            bidAmount
        });

        await application.save();
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to apply for job' });
    }
});

// 3️Filter by Category
router.get('/category/:categoryName', async(req, res) => {
    try {
        const jobs = await Job.find({ category: req.params.categoryName });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category jobs' });
    }
});

// 4️ Filter by Skill or Language
router.get('/filter', async(req, res) => {
    const { skill, language } = req.query;

    try {
        let query = {};
        if (skill) query.skills = skill;
        if (language) query.language = language;

        const jobs = await Job.find(query);
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to filter jobs' });
    }
});

// 5️ Top Rated Jobs
router.get('/top-rated', async(req, res) => {
    try {
        const jobs = await Job.find({ isTopRated: true });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top rated jobs' });
    }
});

// 6️ Job Details (Optional)
router.get('/:jobId', async(req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        res.json(job);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch job details' });
    }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Issue = require('../models/Issue');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// ✅ GET all issues
router.get('/', async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error('Error fetching issues:', err.message);
    res.status(500).json({ error: 'Server error while fetching issues' });
  }
});

// ✅ POST a new issue
router.post('/', upload.array('photos', 3), async (req, res) => {
  try {
    const { title, description, category, latitude, longitude } = req.body;

    if (!title || !description || !category || !latitude || !longitude) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const issue = new Issue({
      title,
      description,
      category,
      photo: req.files.map(file => file.path),
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      status: 'Reported'
    });

    await issue.save();
    res.status(201).json({ message: 'Issue reported successfully ✅', issue });
  } catch (error) {
    console.error('Error while reporting issue:', error.message);
    res.status(500).json({ error: 'Server error ❌' });
  }
});

// ✅ PATCH status of issue
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Reported', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updated = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Issue not found' });

    res.json({ message: 'Status updated successfully ✅', issue: updated });
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ error: 'Server error while updating status' });
  }
});

// ✅ DELETE an issue
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Issue.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Issue not found' });

    res.json({ message: 'Issue deleted successfully ✅' });
  } catch (err) {
    console.error('Error deleting issue:', err.message);
    res.status(500).json({ error: 'Server error while deleting issue' });
  }
});

// ✅ PATCH /api/issues/:id/flag - toggle spam/invalid flag
router.patch('/:id/flag', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    issue.isFlagged = !issue.isFlagged;
    await issue.save();

    res.json({ message: `Issue ${issue.isFlagged ? 'flagged' : 'unflagged'} successfully ✅`, issue });
  } catch (err) {
    console.error('Error toggling flag:', err.message);
    res.status(500).json({ error: 'Server error while toggling flag' });
  }
});


module.exports = router;

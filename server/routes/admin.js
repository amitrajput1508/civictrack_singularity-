const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// 🔐 Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email, password });

  if (admin) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

module.exports = router;

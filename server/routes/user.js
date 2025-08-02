const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const newUser = new User({ username, email, phone, password });
    await newUser.save();
    res.status(201).json({ message: '✅ Registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error ❌' });
  }
});

// ✅ Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({ message: '✅ Login successful' });
  } catch (err) {
    res.status(500).json({ error: 'Server error ❌' });
  }
});

module.exports = router;

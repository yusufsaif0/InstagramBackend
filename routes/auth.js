const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const validator = require('validator'); 

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Basic field presence check
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // 2. Name validation
    if (name.trim().length < 3 || name.trim().length > 50) {
      return res.status(400).json({ message: 'Name must be between 3 and 50 characters' });
    }

    // 3. Email format validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 4. Password strength validation
    // Must be at least 8 chars, include uppercase, lowercase, number, and special char
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
      });
    }

    // 5. Check if email already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 6. Hash password and save
    const hashed = await bcrypt.hash(password, 10);
    user = new User({ name: name.trim(), email: email.toLowerCase(), password: hashed });
    await user.save();

    // 7. Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Error in /register:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic field presence check
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Email format validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 3. Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 5. Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Error in /login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

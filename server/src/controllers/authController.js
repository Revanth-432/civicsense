const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'citizen',
    });

    const token = generateToken(newUser._id);
    
    // Remove password from output
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const token = generateToken(user._id);
    
    // Remove password from output
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
};

module.exports = { register, login, getMe };

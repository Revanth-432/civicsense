const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'You are not logged in. Please log in to get access.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return res.status(401).json({ message: 'The user belonging to this token does no longer exist.' });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token', error: error.message });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
};

module.exports = { protect, restrictTo };

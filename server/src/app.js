const express = require('express');
const http = require('http');
const { initSocket } = require('./utils/socket');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const clusterRoutes = require('./routes/clusterRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { startSlaMonitor } = require('./jobs/slaMonitor');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Route handlers
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

// Database connection & Server start
const PORT = process.env.PORT || 5000;
const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civicsense';

const httpServer = http.createServer(app);
initSocket(httpServer);

mongoose.connect(DB_URI)
  .then(() => {
    console.log('DB connection successful');
    startSlaMonitor(); // Start the background job
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.log('DB connection error: ', err));

module.exports = app;

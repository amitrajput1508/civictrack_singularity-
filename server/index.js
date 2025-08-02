require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const issueRoutes = require('./routes/issues');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');


const app = express();
app.use(cors());
app.use(express.json());
connectDB();
app.use('/api/users', userRoutes);  // 👈 Mount user routes


// Attach the route
app.use('/api/issues', issueRoutes);
app.use('/uploads', express.static('uploads')); // 🖼️ Serve uploaded images
app.use('/api/admin', adminRoutes);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

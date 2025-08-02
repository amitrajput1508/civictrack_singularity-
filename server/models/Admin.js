const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: String,
  password: String // Note: store hashed passwords in production
});

module.exports = mongoose.model('Admin', adminSchema);

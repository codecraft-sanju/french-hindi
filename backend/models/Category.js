const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true }, 
  name: { type: String, required: true },
  subtitle: { type: String },
  icon: { type: String },
  bgColor: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
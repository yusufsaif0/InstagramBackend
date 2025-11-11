const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
  mediaUrl: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const auth = require('../middlewares/authMiddleware');

// ensure uploads dir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// Create post (draft or publish)
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { caption = '', status = 'draft' } = req.body;

    // 1. Validate caption length (optional but recommended)
    if (caption && caption.length > 300) {
      return res.status(400).json({ message: 'Caption too long (max 300 characters)' });
    }

    // 2. Validate status
    const allowedStatuses = ['draft', 'published'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid post status' });
    }

    // 3. Validate media file (if present)
    let mediaUrl = '';
    let mediaType = 'none';

    if (req.file) {
      const mimetype = req.file.mimetype || '';
      const isImage = mimetype.startsWith('image/');
      const isVideo = mimetype.startsWith('video/');

      if (!isImage && !isVideo) {
        return res.status(400).json({ message: 'Invalid media type. Only images or videos allowed.' });
      }

      mediaUrl = '/uploads/' + req.file.filename;
      mediaType = isVideo ? 'video' : 'image';
    }

    // 4. Create post
    const post = new Post({
      user: req.user._id,
      caption: caption.trim(),
      mediaType,
      mediaUrl,
      status,
    });

    await post.save();

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post,
    });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get published feed (all users)
router.get('/feed', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const posts = await Post.find({ user: userId,status: 'published', })
      .populate('user', 'name') // get user name only
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get current user's drafts
router.get('/drafts', auth, async (req, res) => {
  try {
    const drafts = await Post.find({ user: req.user._id, status: 'draft' }).sort({ createdAt: -1 });
    res.json(drafts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish a draft
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { status: 'published' }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit post (caption) or replace media
router.put('/:id', auth, upload.single('media'), async (req, res) => {
  try {
    const update = {};
    if (req.body.caption) update.caption = req.body.caption;
    if (req.file) {
      update.mediaUrl = '/uploads/' + req.file.filename;
      update.mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    }
    const post = await Post.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, update, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

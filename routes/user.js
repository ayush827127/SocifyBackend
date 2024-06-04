const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const { body, validationResult } = require('express-validator');

// Add a new user
router.post('/add',
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const newUser = new User({ username, email, password });
      await newUser.save();
      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error creating user' });
    }
  });

// Get all users
router.get('/all', async (req, res) => {
  try {
    const users = await User.find({}, 'username email followers following'); // Fetch only username and email fields
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Follow a user
router.post('/follow/:followedEmail',
  body('followerEmail').isEmail().withMessage('Invalid email').normalizeEmail(),
  async (req, res) => {
    const { followedEmail } = req.params;
    const { followerEmail } = req.body;

    try {
      const follower = await User.findOne({ email: followerEmail });
      const followed = await User.findOne({ email: followedEmail });

      if (!follower || !followed) {
        return res.status(400).json({ error: 'User not found' });
      }

      if (follower.following.includes(followed._id)) {
        return res.status(400).json({ error: 'Already following this user' });
      }

      follower.following.push(followed._id);
      followed.followers.push(follower._id);

      await follower.save();
      await followed.save();

      res.status(200).json({ message: 'User followed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error following user' });
    }
  });

// Unfollow a user
router.post('/unfollow/:followedEmail',
  body('followerEmail').isEmail().withMessage('Invalid email').normalizeEmail(),
  async (req, res) => {
    const { followedEmail } = req.params;
    const { followerEmail } = req.body;

    try {
      const follower = await User.findOne({ email: followerEmail });
      const followed = await User.findOne({ email: followedEmail });

      if (!follower || !followed) {
        return res.status(400).json({ error: 'User not found' });
      }

      follower.following.pull(followed._id);
      followed.followers.pull(follower._id);

      await follower.save();
      await followed.save();

      res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error unfollowing user' });
    }
  });

// Fetch followers
router.get('/followers/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email }).populate('followers', 'username email');
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    res.status(200).json(user.followers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching followers' });
  }
});

// Fetch following count
router.get('/following/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email }).populate('following', 'username email');
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    res.status(200).json(user.following);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching following count' });
  }
});

module.exports = router;

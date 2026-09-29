const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../utils/sendEmail');

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, academicYear } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    academicYear,
    role: 'student'
  });

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    },
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been disabled. Contact admin.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = [
    'name',
    'academicYear',
    'monthlyAllowanceBaseline',
    'monthlySavingsGoal',
    'avatarUrl',
    'preferences',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current and new password are required');
  }
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated successfully' });
});

const GENERIC_RESET_MESSAGE = 'If that email exists, a reset link has been sent';

const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email) {
    res.status(400);
    throw new Error('Please enter your email address');
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  await user.save();

  try {
    await sendPasswordResetEmail(user.email, resetToken);
  } catch (err) {
    console.error('[forgot-password] could not send email:', err.message);

    if (process.env.NODE_ENV === 'production') {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      res.status(500);
      throw new Error('Email could not be sent, please try again later');
    }

    const devUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    console.log(`[forgot-password] (dev) reset link for ${user.email}: ${devUrl}`);
    return res.status(200).json({
      success: true,
      message: GENERIC_RESET_MESSAGE,
      emailSent: false,
      devResetToken: resetToken,
    });
  }

  res.status(200).json({ success: true, message: GENERIC_RESET_MESSAGE, emailSent: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    res.status(400);
    throw new Error('Reset link is invalid or has expired');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful, please log in',
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || user.role !== 'admin') {
    res.status(401);
    throw new Error('Invalid admin credentials');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been disabled');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid admin credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    },
  });
});

module.exports = {
  registerUser,
  loginUser,
  adminLogin,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
};
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({ success: true, token, user });
};

// POST /auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, adminSecret } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const role = adminSecret === process.env.ADMIN_SECRET ? 'admin' : 'user';
    const user = await User.create({ name, email, password, role, provider: 'local' });
    sendToken(user, 201, res);
  } catch (err) { next(err); }
};

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    sendToken(user, 200, res);
  } catch (err) { next(err); }
};

// POST /auth/google
const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, message: 'Google credential is required' });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (user) {
      // Link Google if account exists via email
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture;
        user.provider = 'google';
        await user.save();
      }
    } else {
      user = await User.create({ name, email, googleId, avatar: picture, provider: 'google', role: 'user' });
    }
    sendToken(user, 200, res);
  } catch (err) { next(err); }
};

// GET /auth/me
const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

module.exports = { register, login, googleAuth, getMe };

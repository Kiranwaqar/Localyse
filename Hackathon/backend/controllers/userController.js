const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = "customer", location, preferences } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required." });
    }

    if (role !== "customer") {
      return res.status(400).json({ message: "Use /api/merchants/signup for merchant accounts." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "customer",
      location,
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      preferences: user.preferences,
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    if (role && role !== "customer") {
      return res.status(400).json({ message: "Use /api/merchants/login for merchant accounts." });
    }

    const user = await User.findOne({ email, role: "customer" }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email, password, or role." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email, password, or role." });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      preferences: user.preferences,
    });
  } catch (error) {
    return next(error);
  }
};

const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, location, preferences } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required." });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        name,
        email,
        ...(location ? { location } : {}),
        preferences: Array.isArray(preferences) ? preferences : [],
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      preferences: user.preferences,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createUser,
  loginUser,
  getUsers,
  updateUser,
};

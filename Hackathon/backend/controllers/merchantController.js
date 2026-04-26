const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Merchant = require("../models/Merchant");

const createMerchant = async (req, res, next) => {
  try {
    const { name, email, password, category, location, businessRules } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: "name and category are required." });
    }

    const existingMerchant = email ? await Merchant.findOne({ email }) : null;
    if (existingMerchant) {
      return res.status(409).json({ message: "A merchant with this email already exists." });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const merchant = await Merchant.create({
      name,
      email,
      password: hashedPassword,
      category,
      location,
      businessRules,
    });

    return res.status(201).json(merchant);
  } catch (error) {
    return next(error);
  }
};

const signupMerchant = async (req, res, next) => {
  try {
    const { name, email, password, category, location, businessRules } = req.body;

    if (!name || !email || !password || !category) {
      return res.status(400).json({ message: "name, email, password, and category are required." });
    }

    const existingMerchant = await Merchant.findOne({ email });
    if (existingMerchant) {
      return res.status(409).json({ message: "A merchant with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const merchant = await Merchant.create({
      name,
      email,
      password: hashedPassword,
      category,
      location,
      businessRules,
    });

    return res.status(201).json({
      _id: merchant._id,
      name: merchant.name,
      email: merchant.email,
      role: "merchant",
      category: merchant.category,
      location: merchant.location,
    });
  } catch (error) {
    return next(error);
  }
};

const loginMerchant = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const merchant = await Merchant.findOne({ email }).select("+password");

    if (!merchant || !merchant.password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, merchant.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      _id: merchant._id,
      name: merchant.name,
      email: merchant.email,
      role: "merchant",
      category: merchant.category,
      location: merchant.location,
    });
  } catch (error) {
    return next(error);
  }
};

const getMerchants = async (_req, res, next) => {
  try {
    const merchants = await Merchant.find().select("-password").sort({ createdAt: -1 });
    return res.json(merchants);
  } catch (error) {
    return next(error);
  }
};

const updateMerchant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, category, location, businessRules } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid merchant id." });
    }

    if (!name || !email || !category) {
      return res.status(400).json({ message: "name, email, and category are required." });
    }

    const existingMerchant = await Merchant.findOne({ email, _id: { $ne: id } });
    if (existingMerchant) {
      return res.status(409).json({ message: "A merchant with this email already exists." });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      id,
      {
        name,
        email,
        category,
        location,
        ...(businessRules ? { businessRules } : {}),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found." });
    }

    return res.json({
      _id: merchant._id,
      name: merchant.name,
      email: merchant.email,
      role: "merchant",
      category: merchant.category,
      location: merchant.location,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createMerchant,
  signupMerchant,
  loginMerchant,
  getMerchants,
  updateMerchant,
};

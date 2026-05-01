const mongoose = require("mongoose");
const Merchant = require("../models/Merchant");
const { normalizeMerchantName } = require("./normalizeMerchantName");

const BUSINESS_NAME_TAKEN_MESSAGE =
  "A business with this name is already registered. Choose a different name.";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Legacy rows may not have nameNormalized; match display name case-insensitively with flexible spacing. */
function normalizedKeyToNamePattern(key) {
  const parts = key.split(" ").map((p) => escapeRegex(p));
  if (parts.length === 0) return null;
  return new RegExp(`^\\s*${parts.join("\\s+")}\\s*$`, "i");
}

async function findMerchantByNormalizedName(rawName, excludeMerchantId) {
  const key = normalizeMerchantName(rawName);
  if (!key) return null;

  const exclusion =
    excludeMerchantId && mongoose.Types.ObjectId.isValid(String(excludeMerchantId))
      ? { _id: { $ne: excludeMerchantId } }
      : {};

  const byKey = await Merchant.findOne({ ...exclusion, nameNormalized: key }).select("_id name").lean();
  if (byKey) return byKey;

  const pattern = normalizedKeyToNamePattern(key);
  if (!pattern) return null;

  return Merchant.findOne({
    ...exclusion,
    nameNormalized: { $exists: false },
    name: pattern,
  })
    .select("_id name")
    .lean();
}

function isDuplicateMerchantNameKeyError(err) {
  return Boolean(err && err.code === 11000 && /nameNormalized/i.test(String(err.message || "")));
}

module.exports = {
  findMerchantByNormalizedName,
  BUSINESS_NAME_TAKEN_MESSAGE,
  isDuplicateMerchantNameKeyError,
};

const mongoose = require("mongoose");
const Offer = require("../models/Offer");
const OfferClaim = require("../models/OfferClaim");

const normalizeText = (value) => String(value || "").trim().toLowerCase();
let setupComplete = false;

const backfillOfferClaims = async () => {
  const offers = await Offer.find({ "claims.0": { $exists: true } })
    .populate("merchant", "name email")
    .select("merchant merchantName offerText targetItem discountPercentage category expiresAt claims")
    .lean();

  const operations = offers.flatMap((offer) =>
    (offer.claims || [])
      .filter((claim) => claim.couponCode && claim.customerEmail)
      .map((claim) => {
        const customerObjectId = mongoose.Types.ObjectId.isValid(claim.customerId)
          ? new mongoose.Types.ObjectId(claim.customerId)
          : undefined;
        const customerEmail = normalizeText(claim.customerEmail);
        const merchantId = offer.merchant?._id || offer.merchant;

        return {
          updateOne: {
            filter: {
              offer: offer._id,
              customerEmail,
            },
            update: {
              $setOnInsert: {
                merchant: merchantId,
                merchantName: offer.merchantName,
                merchantEmail: offer.merchant?.email,
                offer: offer._id,
                offerText: offer.offerText,
                targetItem: offer.targetItem,
                discountPercentage: offer.discountPercentage,
                category: offer.category,
                offerExpiresAt: offer.expiresAt,
                customer: customerObjectId,
                customerName: claim.customerName || "Customer",
                customerEmail,
                couponCode: claim.couponCode,
                status: claim.redeemedAt ? "redeemed" : "claimed",
                estimatedRevenue: claim.estimatedRevenue || 0,
                notifications: claim.notifications,
                customerInfo: {
                  id: customerObjectId,
                  name: claim.customerName || "Customer",
                  email: customerEmail,
                },
                merchantInfo: {
                  id: merchantId,
                  name: offer.merchantName,
                  email: offer.merchant?.email,
                },
                offerDetails: {
                  id: offer._id,
                  text: offer.offerText,
                  targetItem: offer.targetItem,
                  discountPercentage: offer.discountPercentage,
                  category: offer.category,
                  expiresAt: offer.expiresAt,
                },
                claimedAt: claim.claimedAt || new Date(),
                redeemedAt: claim.redeemedAt,
              },
            },
            upsert: true,
          },
        };
      })
  );

  if (operations.length === 0) {
    return 0;
  }

  try {
    const result = await OfferClaim.bulkWrite(operations, { ordered: false });
    return result.upsertedCount || 0;
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    return 0;
  }
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Add it to backend/.env before starting the server.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      autoIndex: process.env.NODE_ENV !== "production",
    });

    console.log(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);

    if (setupComplete) {
      return connection;
    }

    await OfferClaim.createCollection();
    await OfferClaim.init();
    console.log("Offer claims collection ready: offerclaims");

    const copiedClaims = await backfillOfferClaims();
    if (copiedClaims > 0) {
      console.log(`Copied ${copiedClaims} existing offer claims into offerclaims.`);
    }

    try {
      await connection.connection.collection("offers").dropIndex("expiresAt_1");
      console.log("Removed old offer TTL index so expired offers remain available for analytics.");
    } catch (error) {
      if (error.codeName !== "IndexNotFound") {
        console.warn("Could not remove old offer TTL index:", error.message);
      }
    }

    setupComplete = true;
    return connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Mongoose will attempt to reconnect when possible.");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB runtime error:", error.message);
});

module.exports = connectDB;

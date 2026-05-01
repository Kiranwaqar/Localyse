const multer = require("multer");
const xlsx = require("xlsx");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Offer = require("../models/Offer");
const User = require("../models/User");
const { getWeatherContext, getWeatherActionLines } = require("../services/weatherService");
const { getContextInsights, getPriceBenchmarkInsight } = require("../services/tavilyService");
const { APP_CURRENCY, formatPkr } = require("../utils/currency");
const {
  CATEGORIES,
  calculateBudgetUsage,
  categorizeTransaction,
  getMonthBounds,
  rankOffersForBudgetState,
} = require("../services/budgetIntelligenceService");
const {
  runWalletRecommendationsAI,
  mergeWalletRecommendations,
} = require("../services/walletRecommendationsAIService");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(csv|xls|xlsx)$/i.test(file.originalname)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only CSV, XLS, and XLSX transaction files are allowed."));
  },
});

const normalizeCategory = (category) => {
  const normalized = String(category || "").trim().toLowerCase();
  return CATEGORIES.includes(normalized) ? normalized : undefined;
};

const normalizeBudgets = (budgets = {}) =>
  CATEGORIES.reduce((acc, category) => {
    acc[category] = Math.max(0, Number(budgets[category] || 0));
    return acc;
  }, {});

const sumMonthlyBudgets = (budgets) =>
  CATEGORIES.reduce((total, cat) => total + Math.max(0, Number(budgets?.[cat] ?? 0)), 0);


const parseAmount = (value) => {
  if (typeof value === "number") return value;
  const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
  return Number(cleaned);
};

const getOrCreateWallet = async (userId) =>
  Wallet.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        balance: 0,
        currency: APP_CURRENCY,
        monthlyBudgets: normalizeBudgets(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const toDate = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const pickValue = (row, candidates) => {
  const entries = Object.entries(row || {});
  const match = entries.find(([key]) =>
    candidates.some((candidate) => String(key).trim().toLowerCase().includes(candidate))
  );
  return match?.[1];
};

const transactionFromPayload = (payload, userId, source = "manual", uploadMeta = {}) => {
  const amount = parseAmount(payload.amount);
  const merchant = String(payload.merchant || "").trim();
  const description = String(payload.description || "").trim();
  const category =
    normalizeCategory(payload.category) || categorizeTransaction({ merchant, description });

  return {
    user: userId,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    currency: APP_CURRENCY,
    merchant,
    description,
    category,
    occurredAt: toDate(payload.occurredAt || payload.date),
    source,
    upload: uploadMeta,
    raw: source === "upload" ? payload.raw : undefined,
  };
};

const parseTransactionRows = (file) => {
  const workbook = xlsx.read(file.buffer, { type: "buffer", cellDates: true });
  const transactions = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    rows.forEach((row, index) => {
      const amount = pickValue(row, ["amount", "total", "price", "cost", "debit", "spent"]);
      const merchant = pickValue(row, ["merchant", "vendor", "store", "shop", "restaurant"]);
      const description = pickValue(row, ["description", "details", "item", "note", "memo"]);
      const category = pickValue(row, ["category", "type"]);
      const occurredAt = pickValue(row, ["date", "time", "occurred"]);

      if (!amount && !merchant && !description) return;

      transactions.push({
        amount,
        merchant,
        description,
        category,
        occurredAt,
        raw: row,
        uploadMeta: {
          fileName: file.originalname,
          rowNumber: index + 2,
        },
      });
    });
  });

  return transactions;
};

const getMonthlyTransactions = async (userId) => {
  const { start, end } = getMonthBounds();
  return Transaction.find({
    user: userId,
    occurredAt: { $gte: start, $lt: end },
  }).sort({ occurredAt: -1 });
};

const buildWalletResponse = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  const transactions = await getMonthlyTransactions(userId);
  const usage = calculateBudgetUsage(wallet, transactions);

  return {
    wallet: {
      id: wallet._id,
      user: wallet.user,
      balance: wallet.balance,
      currency: wallet.currency,
      monthlyBudgets: wallet.monthlyBudgets,
    },
    usage,
    recentTransactions: transactions.slice(0, 12),
  };
};

const getWallet = async (req, res, next) => {
  try {
    res.json(await buildWalletResponse(req.params.userId));
  } catch (error) {
    next(error);
  }
};

const updateWallet = async (req, res, next) => {
  try {
    const wallet = await getOrCreateWallet(req.params.userId);

    const nextBalance =
      req.body.balance !== undefined ? Math.max(0, Number(req.body.balance || 0)) : Number(wallet.balance || 0);

    const nextMonthlyBudgets = req.body.monthlyBudgets
      ? normalizeBudgets(req.body.monthlyBudgets)
      : normalizeBudgets(wallet.monthlyBudgets || {});

    const allocated = sumMonthlyBudgets(nextMonthlyBudgets);

    if (allocated > nextBalance) {
      return res.status(400).json({
        message: `Monthly category budgets (${formatPkr(allocated)} total) cannot exceed your current balance (${formatPkr(nextBalance)}). Lower category amounts or increase your balance.`,
      });
    }

    wallet.balance = nextBalance;
    wallet.monthlyBudgets = nextMonthlyBudgets;

    await wallet.save();
    res.json(await buildWalletResponse(req.params.userId));
  } catch (error) {
    next(error);
  }
};

const addTransaction = async (req, res, next) => {
  try {
    const transaction = transactionFromPayload(req.body, req.params.userId);

    if (transaction.amount <= 0) {
      res.status(400).json({ message: "Transaction amount must be greater than 0." });
      return;
    }

    await Transaction.create(transaction);
    res.status(201).json(await buildWalletResponse(req.params.userId));
  } catch (error) {
    next(error);
  }
};

const uploadTransactions = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Please upload a CSV, XLS, or XLSX transaction file." });
      return;
    }

    const rows = parseTransactionRows(req.file);
    const transactions = rows
      .map((row) =>
        transactionFromPayload(
          row,
          req.params.userId,
          "upload",
          row.uploadMeta || { fileName: req.file.originalname }
        )
      )
      .filter((transaction) => transaction.amount > 0);

    if (transactions.length === 0) {
      res.status(400).json({ message: "No valid transactions were found in the uploaded file." });
      return;
    }

    await Transaction.insertMany(transactions);
    const response = await buildWalletResponse(req.params.userId);
    res.status(201).json({ ...response, importedCount: transactions.length });
  } catch (error) {
    next(error);
  }
};

const getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    const wallet = await getOrCreateWallet(req.params.userId);
    const transactions = await getMonthlyTransactions(req.params.userId);
    const usage = calculateBudgetUsage(wallet, transactions);
    const selectedCategory = normalizeCategory(req.query.category) || "food";
    const categoryState = usage.find((state) => state.category === selectedCategory) || usage[0];
    const queryLocation =
      req.query.lat && req.query.lng
        ? { lat: Number(req.query.lat), lng: Number(req.query.lng) }
        : user?.location;
    const weatherLocation = queryLocation?.lat && queryLocation?.lng
      ? `${queryLocation.lat},${queryLocation.lng}`
      : "Islamabad";
    const [offers, weather, context, priceTavily] = await Promise.all([
      Offer.find({ expiresAt: { $gt: new Date() } })
        .populate("merchant", "name email location category")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      getWeatherContext(weatherLocation),
      getContextInsights(
        [
          `Islamabad PKR wallet: category ${selectedCategory}, financial state ${categoryState.state}.`,
          `Budget ${formatPkr(categoryState.budget)}, spent ${formatPkr(categoryState.spent)}, remaining ${formatPkr(categoryState.remaining)} (${categoryState.percentUsed}% used).`,
          `Safe daily spend about ${formatPkr(categoryState.dailySafeLimit)}. Forecast: ${categoryState.forecast}`,
          "Brief local demand or deal behavior for this category (one useful insight).",
        ].join(" ")
      ),
      getPriceBenchmarkInsight({ category: selectedCategory, city: "Islamabad" }),
    ]);

    const ranked = rankOffersForBudgetState({
      offers,
      budgetStates: usage,
      selectedCategory,
      userLocation: queryLocation,
      weatherSummary: weather.summary,
      preferences: user?.preferences || [],
    });

    const recentTransactions = transactions.slice(0, 10).map((t) => ({
      amount: t.amount,
      category: t.category,
      merchant: t.merchant,
    }));

    const walletAI = await runWalletRecommendationsAI({
      categoryState,
      selectedCategory,
      usage,
      recommendations: ranked,
      tavilyAnswer: context.source === "tavily" ? context.answer : "",
      weatherSummary: weather.summary,
      recentTransactions,
    });

    const { recommendations: recommendationsOut, aiAnalysis } = mergeWalletRecommendations(ranked, walletAI);

    res.json({
      user_state: categoryState.state,
      category: selectedCategory,
      budget_used: categoryState.percentUsed,
      daily_safe_limit: categoryState.dailySafeLimit,
      forecast: categoryState.forecast,
      recommendations: recommendationsOut,
      aiAnalysis,
      usage,
      context: {
        currency: APP_CURRENCY,
        weather: weather.summary,
        weatherActions: getWeatherActionLines(weather),
        insights: context.answer,
        signals: context.signals || [],
        source: context.source,
        priceBenchmark: {
          answer: priceTavily.answer,
          query: priceTavily.query,
          signals: priceTavily.signals || [],
          source: priceTavily.source,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  getWallet,
  updateWallet,
  addTransaction,
  uploadTransactions,
  getRecommendations,
};

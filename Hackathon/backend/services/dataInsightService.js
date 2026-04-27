const XLSX = require("xlsx");

const normalizeKey = (key) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPercent = (value) => {
  const numeric = toNumber(value);
  if (!numeric) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
};

const findValue = (row, patterns) => {
  const key = Object.keys(row).find((candidate) =>
    patterns.some((pattern) => pattern.test(candidate))
  );
  return key ? row[key] : undefined;
};

const isBlank = (value) => String(value || "").trim() === "";

const headerScore = (row) => {
  const headers = row.map(normalizeKey).filter(Boolean);
  const keywords = [
    "product",
    "item",
    "date",
    "customers",
    "total_sales",
    "top_seller",
    "current_stock",
    "stock_status",
    "ai_action",
    "sell_price",
    "cost_price",
    "max_safe_discount",
  ];

  return headers.filter((header) =>
    keywords.some((keyword) => header.includes(keyword))
  ).length;
};

const readRows = (file) => {
  if (!file) return [];

  try {
    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
      cellDates: true,
      raw: false,
    });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) return [];

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
    });
    const headerIndex = rawRows.reduce(
      (best, row, index) => {
        const score = headerScore(row);
        return score > best.score ? { index, score } : best;
      },
      { index: 0, score: 0 }
    ).index;
    const headers = rawRows[headerIndex].map(normalizeKey);
    const dataRows = rawRows.slice(headerIndex + 1);

    return dataRows
      .map((row) =>
        Object.fromEntries(
          headers
            .map((header, index) => [header, row[index]])
            .filter(([header]) => header)
        )
      )
      .filter((row) => Object.values(row).some((value) => !isBlank(value)));
  } catch (error) {
    console.warn(`Could not parse uploaded file ${file.originalname}:`, error.message);
    return [];
  }
};

const analyzeFinance = (rows) => {
  const productMap = new Map();
  let totalRevenue = 0;
  let totalCosts = 0;
  let explicitProfit = 0;
  let totalCustomers = 0;
  const dayRows = [];
  const topSellerCounts = new Map();

  rows.forEach((row) => {
    const firstText = String(Object.values(row)[0] || "").trim().toLowerCase();
    if (firstText.includes("total")) return;

    const product = String(
      findValue(row, [/top_seller/, /product/, /item/, /sku/, /name/]) || "Unspecified item"
    ).trim();
    const revenue = toNumber(findValue(row, [/total_sales/, /revenue/, /sales/, /amount/, /total/]));
    const cost = toNumber(findValue(row, [/cost/, /expense/, /cogs/]));
    const profit = toNumber(findValue(row, [/profit/, /margin/]));
    const quantity = toNumber(findValue(row, [/customers/, /quantity/, /^qty$/, /units/]));
    const day = String(findValue(row, [/day/]) || "").trim();
    const date = String(findValue(row, [/date/]) || "").trim();
    const notes = String(findValue(row, [/notes/]) || "").trim();

    totalRevenue += revenue;
    totalCosts += cost;
    explicitProfit += profit;
    totalCustomers += quantity;

    if (product && product !== "Unspecified item") {
      topSellerCounts.set(product, (topSellerCounts.get(product) || 0) + 1);
    }

    const existing = productMap.get(product) || {
      product,
      revenue: 0,
      cost: 0,
      profit: 0,
      quantity: 0,
    };

    existing.revenue += revenue;
    existing.cost += cost;
    existing.profit += profit || revenue - cost;
    existing.quantity += quantity;
    productMap.set(product, existing);

    if (revenue > 0 || quantity > 0) {
      dayRows.push({ date, day, revenue, customers: quantity, notes, topSeller: product });
    }
  });

  const profit = explicitProfit || totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? profit / totalRevenue : 0;
  const products = Array.from(productMap.values());
  const underperformingProducts = products
    .filter((item) => item.revenue > 0 || item.profit !== 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);
  const topRevenueProducts = [...products]
    .filter((item) => item.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .map((item) => ({
      product: item.product,
      revenue: item.revenue,
      profit: item.profit,
      shareOfRevenue: totalRevenue > 0 ? item.revenue / totalRevenue : 0,
    }));
  const topSellers = Array.from(topSellerCounts.entries())
    .map(([product, daysAsTopSeller]) => ({ product, daysAsTopSeller }))
    .sort((a, b) => b.daysAsTopSeller - a.daysAsTopSeller)
    .slice(0, 5);
  const slowDays = [...dayRows].sort((a, b) => a.customers - b.customers).slice(0, 3);
  const peakDays = [...dayRows].sort((a, b) => b.customers - a.customers).slice(0, 3);

  return {
    rowsParsed: rows.length,
    totalRevenue,
    totalCosts,
    profit,
    profitMargin,
    totalCustomers,
    averagePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
    topSellers,
    slowDays,
    peakDays,
    underperformingProducts,
    topRevenueProducts,
  };
};

/**
 * Pandas-style rollups in JS: concentration, spread, and pressure scores for LLM + dashboards.
 */
const computeAnalyticalHighlights = (summary) => {
  const f = summary.finance;
  const m = summary.margins;
  const inv = summary.inventory;
  const margins = (m.products || []).map((p) => p.margin).filter((x) => Number.isFinite(x));
  const peakCust = f.peakDays?.length
    ? Math.max(...f.peakDays.map((d) => d.customers || 0))
    : 0;
  const slowCust = f.slowDays?.length
    ? Math.min(...f.slowDays.map((d) => d.customers || 0))
    : 0;
  const daySpread = f.peakDays?.length && f.slowDays?.length ? peakCust - slowCust : 0;
  const top3Share = (f.topRevenueProducts || [])
    .slice(0, 3)
    .reduce((s, p) => s + (p.shareOfRevenue || 0), 0);
  const marginSpread =
    margins.length > 0 ? Math.max(...margins) - Math.min(...margins) : 0;
  const invPressureCount =
    (inv.priorityActionItems?.length || 0) +
    (inv.overstockedItems?.length || 0) +
    (inv.expiringSoon?.length || 0);
  return {
    top3RevenueConcentration: Math.round((top3Share || 0) * 1000) / 1000,
    marginSpread: Math.round((marginSpread || 0) * 1000) / 1000,
    dayTrafficSpread: daySpread,
    inventoryPressureScore: invPressureCount,
    inventoryValuePkr: Math.round(inv.totalInventoryValue || 0),
    skusParsed: {
      financeRows: f.rowsParsed,
      marginRows: m.rowsParsed,
      inventoryRows: inv.rowsParsed,
    },
  };
};

const analyzeMargins = (rows) => {
  const products = rows
    .map((row) => {
      const product = String(findValue(row, [/product/, /item/, /sku/, /name/]) || "").trim();

      if (!product || product.toLowerCase().includes("rule")) return null;

      return {
        product,
        sellPrice: toNumber(findValue(row, [/sell_price/, /price/])),
        costPrice: toNumber(findValue(row, [/cost_price/, /cost/])),
        grossProfit: toNumber(findValue(row, [/gross_profit/, /profit/])),
        margin: toPercent(findValue(row, [/margin/])),
        minSafeDiscount: toPercent(findValue(row, [/min_safe_discount/, /min_discount/])),
        maxSafeDiscount: toPercent(findValue(row, [/max_safe_discount/, /max_discount/])),
      };
    })
    .filter(Boolean);

  return {
    rowsParsed: products.length,
    averageMargin:
      products.length > 0
        ? products.reduce((sum, product) => sum + product.margin, 0) / products.length
        : 0,
    products,
    safestProducts: [...products]
      .sort((a, b) => b.maxSafeDiscount - a.maxSafeDiscount)
      .slice(0, 5),
    lowMarginProducts: [...products]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 5),
  };
};

const analyzeInventory = (rows, financeProducts = []) => {
  const items = rows.map((row) => {
    const name = String(
      findValue(row, [/ingredient/, /product/, /item/, /sku/, /name/]) ||
        "Unspecified item"
    ).trim();
    const quantity = toNumber(findValue(row, [/quantity/, /^qty$/, /stock/, /units/]));
    const price = toNumber(findValue(row, [/price/, /unit_price/, /cost/]));
    const reorderLevel = toNumber(findValue(row, [/reorder_level/, /reorder/]));
    const daysSinceLastSale = toNumber(findValue(row, [/days_since_last_sale/, /last_sale/]));
    const stockStatus = String(findValue(row, [/stock_status/, /status/]) || "").trim();
    const aiAction = String(findValue(row, [/ai_action/, /action/]) || "").trim();
    const expiryValue = findValue(row, [/expiry/, /expiration/, /date/]);
    const expiryDate = expiryValue ? new Date(expiryValue) : null;

    return {
      name,
      quantity,
      price,
      reorderLevel,
      daysSinceLastSale,
      stockStatus,
      aiAction,
      expiryDate: expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null,
    };
  });

  const averageQuantity =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.quantity, 0) / items.length
      : 0;
  const financeNames = new Set(
    financeProducts.slice(0, 8).map((item) => item.product.toLowerCase())
  );
  const twoWeeksFromNow = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const overstockedItems = items
    .filter(
      (item) =>
        item.quantity > 0 &&
        (normalizeKey(item.stockStatus).includes("overstock") ||
          item.quantity >= Math.max(averageQuantity * 1.25, 10))
    )
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const priorityActionItems = items
    .filter((item) => normalizeKey(item.aiAction).includes("prioritise") || normalizeKey(item.aiAction).includes("prioritize"))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const expiringSoon = items
    .filter((item) => item.expiryDate && item.expiryDate.getTime() <= twoWeeksFromNow)
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    .slice(0, 5);
  const slowMovingInventory = items
    .filter(
      (item) =>
        item.daysSinceLastSale >= 7 ||
        financeNames.has(item.name.toLowerCase()) ||
        item.quantity >= averageQuantity
    )
    .slice(0, 5);

  return {
    rowsParsed: rows.length,
    totalItems: items.length,
    totalInventoryValue: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    priorityActionItems,
    overstockedItems,
    expiringSoon,
    slowMovingInventory,
  };
};

const summarizeUploadedData = (files = {}) => {
  const financeRows = readRows(files.financeFile?.[0]);
  const financeInsights = analyzeFinance(financeRows);
  const marginRows = readRows(files.marginFile?.[0]);
  const marginInsights = analyzeMargins(marginRows);
  const inventoryRows = readRows(files.inventoryFile?.[0]);
  const inventoryInsights = analyzeInventory(
    inventoryRows,
    financeInsights.underperformingProducts
  );

  const bundle = {
    finance: financeInsights,
    margins: marginInsights,
    inventory: inventoryInsights,
    files: {
      financeFileName: files.financeFile?.[0]?.originalname,
      inventoryFileName: files.inventoryFile?.[0]?.originalname,
      marginFileName: files.marginFile?.[0]?.originalname,
    },
  };
  return {
    ...bundle,
    analyticalHighlights: computeAnalyticalHighlights(bundle),
  };
};

module.exports = {
  summarizeUploadedData,
  computeAnalyticalHighlights,
  readRows,
};

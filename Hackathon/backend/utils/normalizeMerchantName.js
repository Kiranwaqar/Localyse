function normalizeMerchantName(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

module.exports = { normalizeMerchantName };

const pkrFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const APP_CURRENCY = "PKR";

const formatPkr = (value) => pkrFormatter.format(Number(value || 0));

module.exports = {
  APP_CURRENCY,
  formatPkr,
};

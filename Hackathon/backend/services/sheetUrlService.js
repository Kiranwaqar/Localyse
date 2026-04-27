const axios = require("axios");

/**
 * Fetch a **published** Google Sheet as CSV (no API key) and return row objects.
 * Sheet must be shared: "Anyone with the link" → Viewer, or "Publish to web".
 *
 * URL shapes supported:
 * - https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
 * - full /export?format=csv&gid=0
 */
const extractSheetId = (input) => {
  const s = String(input || "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
};

const parseSimpleCsv = (text) => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const splitLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || c === "\t") {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    String(h || "")
      .replace(/^"|"$/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row = {};
    headers.forEach((h, i) => {
      if (h) row[h] = String(cells[i] ?? "").replace(/^"|"$/g, "").trim();
    });
    return row;
  });
  return { headers, rows };
};

const fetchPublishedGoogleSheetRows = async (sheetIdOrUrl, gid = 0) => {
  const id = extractSheetId(sheetIdOrUrl) || (sheetIdOrUrl && !String(sheetIdOrUrl).includes("http") ? String(sheetIdOrUrl) : null);
  if (!id) {
    return { ok: false, error: "Could not parse Google Sheet id from URL." };
  }
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  try {
    const { data, status } = await axios.get(url, {
      timeout: 20000,
      responseType: "text",
      validateStatus: () => true,
    });
    if (status >= 400) {
      return { ok: false, error: `Sheet request failed (${status}). Is the sheet published or link-shared?` };
    }
    const { headers, rows } = parseSimpleCsv(data);
    return { ok: true, sheetId: id, headers, rows, rowCount: rows.length };
  } catch (e) {
    return { ok: false, error: e.message || "Network error fetching sheet." };
  }
};

module.exports = {
  extractSheetId,
  fetchPublishedGoogleSheetRows,
  parseSimpleCsv,
};

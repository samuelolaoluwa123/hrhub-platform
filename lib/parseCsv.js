// Minimal CSV parser — handles quoted fields containing commas,
// newlines, and escaped quotes ("" inside a quoted field). No new
// dependency; the export side (lib/csv.js) already hand-rolls its own
// encoder, this is the matching decoder.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { pushField(); continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { pushRow(); continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  if (nonEmpty.length === 0) return { headers: [], records: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const records = nonEmpty.slice(1).map((r) => {
    const record = {};
    headers.forEach((h, i) => { record[h] = (r[i] ?? "").trim(); });
    return record;
  });

  return { headers, records };
}

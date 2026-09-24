const fs = require("fs");
const f = process.argv[2];
const out = process.argv[3];
const s = fs.readFileSync(f, "utf8");
const lines = s.split("\n");
const li = lines.findIndex((l) => l.indexOf("Vitals Trend History") >= 0);
const res = [];
res.push("HEADING_LINE:" + (li + 1) + " count:" + (s.split("Vitals Trend History").length - 1));
const start = Math.max(0, li - 20);
for (let i = start; i <= Math.min(li + 26, lines.length - 1); i++) {
  let t = lines[i];
  if (t.length > 200) t = t.slice(0, 200) + "...[x]";
  res.push((i + 1) + ":" + t);
}
fs.writeFileSync(out, res.join("\n"), "utf8");

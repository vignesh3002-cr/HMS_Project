const fs = require("fs");
const SRC = "C:\\Projects\\HMS_Project\\figma-to-react-85f\\client\\pages\\doctor\\patient-details.tsx";
const lines = fs.readFileSync(SRC, "utf8").split(/r?\n/);
const out = [];
const hits = [];
lines.forEach((l, i) => { if (l.indexOf("Vitals Trend History") >= 0) hits.push(i + 1); });
out.push("hits=" + JSON.stringify(hits));
const want = hits[0] || 1;
out.push("--region--");
for (let i = Math.max(1, want - 6); i <= Math.min(lines.length, want + 10); i++) {
  out.push(i + ":" + lines[i - 1]);
}
fs.writeFileSync("C:\\Projects\\HMS_Project\\figma-to-react-85f\\anchors_region.txt", out.join("\n"), "utf8");
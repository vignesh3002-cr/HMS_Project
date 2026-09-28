const fs = require("fs");
const SRC = "C:\\Projects\\HMS_Project\\figma-to-react-85f\\client\\pages\\doctor\\patient-details.tsx";
const OUT = "C:\\Projects\\HMS_Project\\figma-to-react-85f\\ptanchor_clean.txt";
const s = fs.readFileSync(SRC, "utf8");
const lines = s.split(/\r?\n/);
const want = lines.findIndex((l) => l.indexOf("Vitals Trend History") >= 0);
const out = [];
out.push("heading line (1-based): " + (want + 1));
out.push("occurrences: " + lines.filter((l) => l.indexOf("Vitals Trend History") >= 0).length);
out.push("---- the isolated h2 + heading block (exact, split) ----");
for (let i = want - 3; i <= want + omp2; i++) {
  out.push((i + 1) + ": " + lines[i]);
}
out.push("---- the card-open div several lines above ----");
let j = want;
while (j > 0 && lines[j].indexOf("bg-white border border-gray-200 rounded-xl p-5 shadow-sm") < 0) j--;
out.push("card-open at 1-based: " + (j + 1));
for (let i = j; i <= Math.min(j + 6, lines.length - 1); i++) out.push((i + 1) + ": " + lines[i]);
fs.writeFileSync(OUT, out.join("\n"), "utf8");

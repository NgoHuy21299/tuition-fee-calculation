require("./d1-log-preload.cjs");

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function tsName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

ensureDir(path.resolve(process.cwd(), "logs"));
const queryLogPath = path.resolve(process.cwd(), `logs/query_${tsName()}.txt`);
const expensiveLogPath = path.resolve(process.cwd(), `logs/expensive-queries_${tsName()}.txt`);
const queryWs = fs.createWriteStream(queryLogPath, { flags: "a" });
const expensiveWs = fs.createWriteStream(expensiveLogPath, { flags: "a" });

let currentSink = null; // null | "query" | "expensive"

function handleData(data) {
  const text = data.toString();
  // Mirror to terminal
  process.stdout.write(text);
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (line.includes("[D1 QUERY]")) {
      currentSink = "query";
      continue; // header printed; content lines follow
    }
    if (line.includes("[D1 EXPENSIVE]")) {
      currentSink = "expensive";
      continue;
    }
    if (currentSink === "query") {
      queryWs.write(line + "\n");
      if (line.startsWith("------------------------------------------------------------")) currentSink = null;
    } else if (currentSink === "expensive") {
      expensiveWs.write(line + "\n");
      if (line.startsWith("------------------------------------------------------------")) currentSink = null;
    }
  }
}

const child = spawn("npx", ["wrangler", "dev", "--port=5173", "--inspector-port=9229"], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
});

child.stdout.on("data", handleData);
child.stderr.on("data", handleData);

child.on("exit", (code) => {
  queryWs.end();
  expensiveWs.end();
  process.exit(code);
});

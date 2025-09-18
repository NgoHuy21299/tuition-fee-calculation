// Expose a host-side hook for writing log files from the Worker during dev
// This runs in Node (your dev host), not inside the Worker runtime.
// It creates the logs/ directory and appends entries to a per-run file.

const fs = require('fs');
const path = require('path');

// Optional: disable normal query logs (expensive logs still recorded by the worker)
if (process.env.DISABLE_D1_QUERY_LOGS === '1') {
  globalThis.DISABLE_D1_QUERY_LOGS = true;
}

globalThis.__writeDevLog = async ({ fileName, content, append }) => {
  const fullPath = path.resolve(process.cwd(), fileName);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, content, {
    encoding: 'utf-8',
    flag: append ? 'a' : 'w',
  });
};

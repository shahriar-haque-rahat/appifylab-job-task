"use strict";

const isDevelopment = process.env.NODE_ENV !== "production";

function write(method, ...args) {
  if (!isDevelopment) return;
  console[method](...args);
}

const logger = {
  log: (...args) => write("log", ...args),

  info: (...args) => write("info", ...args),

  warn: (...args) => write("warn", ...args),

  error: (...args) => write("error", ...args),

  debug: (...args) => write("debug", ...args),

  table: (...args) => {
    if (!isDevelopment) return;
    console.table(...args);
  },

  dir: (obj, options = { depth: null }) => {
    if (!isDevelopment) return;
    console.dir(obj, options);
  },
};

module.exports = logger;
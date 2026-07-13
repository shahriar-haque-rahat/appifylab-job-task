const isDevelopment = process.env.NODE_ENV === "development";

function write(
  method: "log" | "info" | "warn" | "debug",
  ...args: unknown[]
) {
  if (!isDevelopment) return;
  console[method](...args);
}

export const logger = {
  log: (...args: unknown[]) => write("log", ...args),

  info: (...args: unknown[]) => write("info", ...args),

  warn: (...args: unknown[]) => write("warn", ...args),

  debug: (...args: unknown[]) => write("debug", ...args),

  error: (...args: unknown[]) => {
    // Keep errors visible in production.
    console.error(...args);
  },

  table: (data: unknown) => {
    if (!isDevelopment) return;
    console.table(data);
  },

  dir: (data: unknown) => {
    if (!isDevelopment) return;
    console.dir(data, { depth: null });
  },
};

export default logger;
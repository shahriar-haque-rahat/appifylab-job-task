"use strict";

function encodeCursor({ createdAt, id }) {
  const ts = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
  return Buffer.from(`${ts}|${id}`).toString("base64url");
}

function decodeCursor(raw) {
  if (!raw) return null;
  try {
    const s = Buffer.from(raw, "base64url").toString("utf8");
    const idx = s.lastIndexOf("|");
    if (idx < 0) return null;
    const ts = s.slice(0, idx);
    const id = s.slice(idx + 1);
    const createdAt = new Date(ts);
    if (Number.isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

module.exports = { encodeCursor, decodeCursor };

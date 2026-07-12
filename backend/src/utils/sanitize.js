"use strict";

const sanitizeHtml = require("sanitize-html");

function decodeBasicEntities(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&"); // decode &amp; last
}

/**
 * @param {unknown} input
 * @returns {string} plain-text, tag-free, trimmed
 */
function sanitizeText(input) {
  if (typeof input !== "string") return "";
  const stripped = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
  return decodeBasicEntities(stripped).trim();
}

module.exports = { sanitizeText };

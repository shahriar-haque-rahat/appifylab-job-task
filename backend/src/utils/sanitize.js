"use strict";

/**
 * Post/comment bodies are plain text. We run every user-supplied string through
 * sanitize-html with an empty allow-list, which discards ALL tags (so no markup,
 * scripts, or event handlers can be stored), then decode the handful of HTML
 * entities sanitize-html emits so the stored value is the user's literal text.
 * The frontend renders it as a React text node (escaped again at render), giving
 * defence-in-depth against stored XSS.
 */

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

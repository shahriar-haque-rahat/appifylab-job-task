"use strict";

const { z } = require("zod");

const zUuid = z.string().uuid("Invalid id");

// Route params `:id`
const idParams = { params: z.object({ id: zUuid }) };

// NOTE: cursor pagination query schemas live in each module's validation file
// (the cursor is an opaque base64 string, NOT a uuid) — see e.g.
// posts.validation.js `listPostsSchema`.

module.exports = { zUuid, idParams };

"use strict";

const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

router.use("/auth", require("../modules/auth/auth.routes"));
router.use("/users", require("../modules/users/users.routes"));
router.use("/posts", require("../modules/posts/posts.routes"));
router.use("/comments", require("../modules/comments/comments.routes"));
router.use("/likes", require("../modules/likes/likes.routes"));
router.use("/uploads", require("../modules/uploads/uploads.routes"));

module.exports = router;

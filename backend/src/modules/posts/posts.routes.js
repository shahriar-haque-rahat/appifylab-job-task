"use strict";

const express = require("express");
const ctrl = require("./posts.controller");
const repo = require("./posts.repository");
const { authenticate } = require("../../middlewares/authenticate");
const { csrfProtection } = require("../../middlewares/csrf");
const { validate } = require("../../middlewares/validate");
const { requireOwnership } = require("../../middlewares/requireOwnership");
const { contentCreateLimiter } = require("../../middlewares/rateLimiter");
const {
  createPostSchema,
  updatePostSchema,
  listPostsSchema,
} = require("./posts.validation");
const { idParams } = require("../../utils/schemas");

const router = express.Router();

// Loader used by requireOwnership on edit/delete (runs after params validation).
const loadPost = (req) => repo.findOwnership(req.valid.params.id);
const ownPost = requireOwnership(loadPost, { resourceName: "post" });

router.use(authenticate);
router.use(csrfProtection); // no-op on GET/HEAD; enforced on POST/PATCH/DELETE

router.get("/", validate(listPostsSchema), ctrl.list);
router.post("/", contentCreateLimiter, validate(createPostSchema), ctrl.create);
router.get("/:id", validate(idParams), ctrl.getById);
router.patch("/:id", validate(updatePostSchema), ownPost, ctrl.update);
router.delete("/:id", validate(idParams), ownPost, ctrl.remove);

module.exports = router;

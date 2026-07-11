"use strict";

const express = require("express");
const ctrl = require("./comments.controller");
const repo = require("./comments.repository");
const { authenticate } = require("../../middlewares/authenticate");
const { csrfProtection } = require("../../middlewares/csrf");
const { validate } = require("../../middlewares/validate");
const { requireOwnership } = require("../../middlewares/requireOwnership");
const { contentCreateLimiter } = require("../../middlewares/rateLimiter");
const {
  createCommentSchema,
  updateCommentSchema,
  listCommentsSchema,
  repliesSchema,
} = require("./comments.validation");
const { idParams } = require("../../utils/schemas");

const router = express.Router();

const loadComment = (req) => repo.findOwnership(req.valid.params.id);
const ownComment = requireOwnership(loadComment, { resourceName: "comment" });

router.use(authenticate);
router.use(csrfProtection);

router.get("/", validate(listCommentsSchema), ctrl.list); // ?postId=
router.post("/", contentCreateLimiter, validate(createCommentSchema), ctrl.create);
router.get("/:id/replies", validate(repliesSchema), ctrl.replies);
router.get("/:id", validate(idParams), ctrl.getById);
router.patch("/:id", validate(updateCommentSchema), ownComment, ctrl.update);
router.delete("/:id", validate(idParams), ownComment, ctrl.remove);

module.exports = router;

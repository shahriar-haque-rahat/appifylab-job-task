"use strict";

const express = require("express");
const ctrl = require("./likes.controller");
const { authenticate } = require("../../middlewares/authenticate");
const { csrfProtection } = require("../../middlewares/csrf");
const { validate } = require("../../middlewares/validate");
const { likeParams, likersSchema } = require("./likes.validation");

const router = express.Router();

router.use(authenticate);
router.use(csrfProtection);

// targetType is "post" | "comment"
router.get("/:targetType/:targetId", validate(likersSchema), ctrl.likers);
router.post("/:targetType/:targetId", validate(likeParams), ctrl.like);
router.delete("/:targetType/:targetId", validate(likeParams), ctrl.unlike);

module.exports = router;

"use strict";

const express = require("express");
const ctrl = require("./users.controller");
const { authenticate } = require("../../middlewares/authenticate");
const { validate } = require("../../middlewares/validate");
const { idParams } = require("../../utils/schemas");

const router = express.Router();

router.use(authenticate);

router.get("/me", ctrl.me);
router.get("/:id", validate(idParams), ctrl.getById);

module.exports = router;

"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const repo = require("./users.repository");

const me = asyncHandler(async (req, res) => {
  const user = await repo.findPublicById(req.user.id);
  if (!user) throw ApiError.notFound("User not found");
  res.json({ user });
});

const getById = asyncHandler(async (req, res) => {
  const user = await repo.findSummaryById(req.valid.params.id);
  if (!user) throw ApiError.notFound("User not found");
  res.json({ user });
});

module.exports = { me, getById };

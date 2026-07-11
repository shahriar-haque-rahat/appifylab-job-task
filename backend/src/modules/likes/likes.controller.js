"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./likes.service");

const like = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.valid.params;
  const result = await service.setLike({
    viewerId: req.user.id,
    targetTypeParam: targetType,
    targetId,
    like: true,
  });
  res.json(result);
});

const unlike = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.valid.params;
  const result = await service.setLike({
    viewerId: req.user.id,
    targetTypeParam: targetType,
    targetId,
    like: false,
  });
  res.json(result);
});

const likers = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.valid.params;
  const { cursor, limit } = req.valid.query;
  const result = await service.getLikers({
    viewerId: req.user.id,
    targetTypeParam: targetType,
    targetId,
    cursorRaw: cursor,
    limit,
  });
  res.json(result);
});

module.exports = { like, unlike, likers };

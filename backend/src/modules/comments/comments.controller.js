"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./comments.service");

const create = asyncHandler(async (req, res) => {
  const { postId, text, parentId } = req.valid.body;
  const comment = await service.createComment({
    viewerId: req.user.id,
    postId,
    text,
    parentId,
  });
  res.status(201).json({ comment });
});

const list = asyncHandler(async (req, res) => {
  const { postId, cursor, limit } = req.valid.query;
  const page = await service.listComments({
    viewerId: req.user.id,
    postId,
    cursorRaw: cursor,
    limit,
  });
  res.json(page);
});

const replies = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.valid.query;
  const page = await service.listReplies({
    viewerId: req.user.id,
    commentId: req.valid.params.id,
    cursorRaw: cursor,
    limit,
  });
  res.json(page);
});

const getById = asyncHandler(async (req, res) => {
  const comment = await service.getComment({
    viewerId: req.user.id,
    id: req.valid.params.id,
  });
  res.json({ comment });
});

const update = asyncHandler(async (req, res) => {
  const comment = await service.updateComment({
    viewerId: req.user.id,
    resource: req.resource,
    data: req.valid.body,
  });
  res.json({ comment });
});

const remove = asyncHandler(async (req, res) => {
  // Returns { id, removedCount } so the client can adjust the post's
  // commentsCount by the exact number of rows removed (comment + its replies).
  const result = await service.deleteComment({
    viewerId: req.user.id,
    resource: req.resource,
  });
  res.json(result);
});

module.exports = { create, list, replies, getById, update, remove };

"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./posts.service");

const create = asyncHandler(async (req, res) => {
  // authorId comes from the token, never the body.
  const post = await service.createPost({
    authorId: req.user.id,
    ...req.valid.body,
  });
  res.status(201).json({ post });
});

const list = asyncHandler(async (req, res) => {
  const { cursor, limit } = req.valid.query;
  const page = await service.getFeedPage({
    viewerId: req.user.id,
    cursorRaw: cursor,
    limit,
  });
  res.json(page);
});

const getById = asyncHandler(async (req, res) => {
  const post = await service.getPostById({
    viewerId: req.user.id,
    id: req.valid.params.id,
  });
  res.json({ post });
});

const update = asyncHandler(async (req, res) => {
  const post = await service.updatePost({
    viewerId: req.user.id,
    resource: req.resource, // loaded + ownership-verified by requireOwnership
    data: req.valid.body,
  });
  res.json({ post });
});

const remove = asyncHandler(async (req, res) => {
  await service.deletePost({ viewerId: req.user.id, resource: req.resource });
  res.status(204).end();
});

module.exports = { create, list, getById, update, remove };

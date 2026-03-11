const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Forum = require('../models/Forum');
const Message = require('../models/Message');

function isAdmin(user) {
  return user.role === 'Administrator';
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function ensureObjectId(res, id, label) {
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: `Ungültige ${label}` });
    return false;
  }

  return true;
}

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function canManageResource(user, ownerId) {
  return isAdmin(user) || String(ownerId) === String(user.id);
}

function parseLimit(limitValue, fallback = 100) {
  const parsedLimit = Number.parseInt(limitValue, 10);

  if (Number.isNaN(parsedLimit)) {
    return fallback;
  }

  return Math.max(1, Math.min(parsedLimit, 200));
}

function buildCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];

  comments.forEach((comment) => {
    const commentObject = comment.toObject();
    commentObject.replies = [];
    commentMap.set(String(commentObject._id), commentObject);
  });

  commentMap.forEach((comment) => {
    if (comment.parentComment) {
      const parent = commentMap.get(String(comment.parentComment));

      if (parent) {
        parent.replies.push(comment);
        return;
      }
    }

    rootComments.push(comment);
  });

  return rootComments;
}

async function deleteCommentThread(rootCommentId) {
  const commentIds = [];
  const queue = [rootCommentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    commentIds.push(currentId);

    const childComments = await Comment.find({ parentComment: currentId }).select('_id');
    queue.push(...childComments.map((comment) => comment._id));
  }

  await Comment.deleteMany({ _id: { $in: commentIds } });
  return commentIds.length;
}

async function deletePostWithRelations(postId) {
  await Comment.deleteMany({ post: postId });
  await Post.findByIdAndDelete(postId);
}

async function deleteForumWithRelations(forumId) {
  const postsInForum = await Post.find({ forum: forumId }).select('_id');
  const postIds = postsInForum.map((post) => post._id);

  if (postIds.length > 0) {
    await Comment.deleteMany({ post: { $in: postIds } });
  }

  await Post.deleteMany({ forum: forumId });
  await Message.deleteMany({ forum: forumId });
  await Forum.findByIdAndDelete(forumId);
}

module.exports = {
  isAdmin,
  normalizeTags,
  isValidObjectId,
  ensureObjectId,
  sanitizeUser,
  canManageResource,
  parseLimit,
  buildCommentTree,
  deleteCommentThread,
  deletePostWithRelations,
  deleteForumWithRelations
};

const express = require('express');
const Post = require('../models/Post');
const Forum = require('../models/Forum');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const {
  ensureObjectId,
  normalizeTags,
  canManageResource,
  buildCommentTree,
  deletePostWithRelations
} = require('../utils/helpers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { tag, search, forumId, authorId } = req.query;
    const moduleTag = req.query.module;
    const query = {};

    if (tag || moduleTag) {
      query.tags = tag || moduleTag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (forumId) {
      if (!ensureObjectId(res, forumId, 'Forum-ID')) return;
      query.forum = forumId;
    }

    if (authorId) {
      if (!ensureObjectId(res, authorId, 'User-ID')) return;
      query.author = authorId;
    }

    const posts = await Post.find(query)
      .populate('author', 'username role')
      .populate('forum', 'title tags')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) return;

    const post = await Post.findById(req.params.id)
      .populate('author', 'username role')
      .populate('forum', 'title tags');

    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) return;

    const post = await Post.findById(req.params.id).select('_id');

    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'username role')
      .sort({ createdAt: 1 });

    res.json(buildCommentTree(comments));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, imageUrl, videoUrl, forumId, tags } = req.body;

    if (!title || !content || !forumId) {
      return res.status(400).json({ message: 'Titel, Inhalt und Forum sind erforderlich' });
    }

    if (!ensureObjectId(res, forumId, 'Forum-ID')) return;

    const forum = await Forum.findById(forumId).select('_id');
    if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });

    const newPost = new Post({
      title: title.trim(),
      content: content.trim(),
      imageUrl,
      videoUrl,
      tags: normalizeTags(tags),
      author: req.user.id,
      forum: forumId
    });

    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'username role')
      .populate('forum', 'title tags');

    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) return;

    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    if (!canManageResource(req.user, post.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Post nicht bearbeiten' });
    }

    const { title, content, imageUrl, videoUrl, forumId, tags } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Der Titel darf nicht leer sein' });
      post.title = title.trim();
    }

    if (content !== undefined) {
      if (!content.trim()) return res.status(400).json({ message: 'Der Inhalt darf nicht leer sein' });
      post.content = content.trim();
    }

    if (forumId !== undefined) {
      if (!ensureObjectId(res, forumId, 'Forum-ID')) return;
      const forum = await Forum.findById(forumId).select('_id');
      if (!forum) return res.status(404).json({ message: 'Forum nicht gefunden' });
      post.forum = forumId;
    }

    if (imageUrl !== undefined) post.imageUrl = imageUrl;
    if (videoUrl !== undefined) post.videoUrl = videoUrl;
    if (tags !== undefined) post.tags = normalizeTags(tags);

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username role')
      .populate('forum', 'title tags');

    res.json(populatedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/upvote', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) return;

    const post = await Post.findById(req.params.id);
    const userId = req.user.id;

    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    if (post.upvotes.some((id) => String(id) === String(userId))) {
      post.upvotes.pull(userId);
    } else {
      post.upvotes.push(userId);
      post.downvotes.pull(userId);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/downvote', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) return;

    const post = await Post.findById(req.params.id);
    const userId = req.user.id;

    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    if (post.downvotes.some((id) => String(id) === String(userId))) {
      post.downvotes.pull(userId);
    } else {
      post.downvotes.push(userId);
      post.upvotes.pull(userId);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Post-ID')) return;

    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    if (!canManageResource(req.user, post.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Post nicht löschen' });
    }

    await deletePostWithRelations(post._id);
    res.json({ message: 'Post wurde gelöscht' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
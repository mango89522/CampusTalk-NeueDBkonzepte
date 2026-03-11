const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const { ensureObjectId, canManageResource, deleteCommentThread } = require('../utils/helpers');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: 'Inhalt und Post-ID sind erforderlich' });
    }

    if (!ensureObjectId(res, postId, 'Post-ID')) return;

    const post = await Post.findById(postId).select('_id');
    if (!post) return res.status(404).json({ message: 'Post nicht gefunden' });

    if (parentCommentId) {
      if (!ensureObjectId(res, parentCommentId, 'Kommentar-ID')) return;

      const parentComment = await Comment.findById(parentCommentId).select('post');

      if (!parentComment) {
        return res.status(404).json({ message: 'Übergeordneter Kommentar nicht gefunden' });
      }

      if (String(parentComment.post) !== String(postId)) {
        return res.status(400).json({ message: 'Antworten müssen im selben Post bleiben' });
      }
    }

    const newComment = new Comment({
      content: content.trim(),
      post: postId,
      author: req.user.id,
      parentComment: parentCommentId || null
    });

    const savedComment = await newComment.save();
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('author', 'username role');

    res.status(201).json(populatedComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Kommentar-ID')) return;

    const comment = await Comment.findById(req.params.id);

    if (!comment) return res.status(404).json({ message: 'Kommentar nicht gefunden' });

    if (!canManageResource(req.user, comment.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Kommentar nicht bearbeiten' });
    }

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Der Kommentarinhalt darf nicht leer sein' });
    }

    comment.content = content.trim();
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate('author', 'username role');
    res.json(populatedComment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!ensureObjectId(res, req.params.id, 'Kommentar-ID')) return;

    const comment = await Comment.findById(req.params.id);

    if (!comment) return res.status(404).json({ message: 'Kommentar nicht gefunden' });

    if (!canManageResource(req.user, comment.author)) {
      return res.status(403).json({ message: 'Du darfst diesen Kommentar nicht löschen' });
    }

    const deletedComments = await deleteCommentThread(comment._id);
    res.json({ message: 'Kommentar wurde gelöscht', deletedComments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
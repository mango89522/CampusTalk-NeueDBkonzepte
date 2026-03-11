const Message = require('../models/Message');
const PrivateMessage = require('../models/PrivateMessage');
const Forum = require('../models/Forum');
const User = require('../models/User');
const { isValidObjectId } = require('../utils/helpers');

function setupSockets(io) {
  io.on('connection', (socket) => {
    socket.join(String(socket.user.id));
    console.log('Ein User hat sich verbunden:', socket.id);

    socket.on('join_forum', async (forumId) => {
      try {
        if (!isValidObjectId(forumId)) {
          return socket.emit('socket_error', { message: 'Ungültige Forum-ID' });
        }

        const forum = await Forum.findById(forumId).select('_id');

        if (!forum) {
          return socket.emit('socket_error', { message: 'Forum nicht gefunden' });
        }

        socket.join(String(forumId));
        console.log(`User ${socket.id} ist Raum ${forumId} beigetreten`);
      } catch (err) {
        socket.emit('socket_error', { message: 'Forum konnte nicht betreten werden' });
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const { forumId, text } = data || {};

        if (!text || !text.trim() || !isValidObjectId(forumId)) {
          return socket.emit('socket_error', { message: 'Forum oder Nachricht ungültig' });
        }

        const forum = await Forum.findById(forumId).select('_id');

        if (!forum) {
          return socket.emit('socket_error', { message: 'Forum nicht gefunden' });
        }

        const newMessage = new Message({
          forum: forumId,
          sender: socket.user.id,
          text: text.trim()
        });

        await newMessage.save();

        io.to(String(forumId)).emit('receive_message', {
          id: newMessage._id,
          forumId,
          text: newMessage.text,
          senderId: socket.user.id,
          senderUsername: socket.user.username,
          createdAt: newMessage.createdAt
        });
      } catch (err) {
        console.error('Forum-Chat Fehler:', err);
        socket.emit('socket_error', { message: 'Nachricht konnte nicht gesendet werden' });
      }
    });

    socket.on('register_private', () => {
      socket.join(String(socket.user.id));
      console.log(`User ${socket.user.id} ist bereit für private Nachrichten.`);
    });

    socket.on('send_private_message', async (data) => {
      try {
        const { recipientId, text } = data || {};

        if (!text || !text.trim() || !isValidObjectId(recipientId)) {
          return socket.emit('socket_error', { message: 'Empfänger oder Nachricht ungültig' });
        }

        const recipient = await User.findById(recipientId).select('_id username');

        if (!recipient) {
          return socket.emit('socket_error', { message: 'Empfänger nicht gefunden' });
        }

        const newMessage = new PrivateMessage({
          sender: socket.user.id,
          recipient: recipientId,
          text: text.trim()
        });

        await newMessage.save();

        io.to(String(recipientId)).to(String(socket.user.id)).emit('receive_private_message', {
          id: newMessage._id,
          senderId: socket.user.id,
          senderUsername: socket.user.username,
          recipientId,
          text: newMessage.text,
          createdAt: newMessage.createdAt
        });
      } catch (err) {
        console.error('Privat-Chat Fehler:', err);
        socket.emit('socket_error', { message: 'Private Nachricht konnte nicht gesendet werden' });
      }
    });

    socket.on('disconnect', () => {
      console.log('User hat die Verbindung getrennt');
    });
  });
}

module.exports = setupSockets;
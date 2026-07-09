require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

const messageSchema = new mongoose.Schema({
  roomId: String,
  senderId: String,
  originalText: String,
  translatedText: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Server is running perfectly' });
});

io.on('connection', (socket) => {
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  socket.on('sendMessage', async (data) => {
    try {
      if (!data.original) throw new Error("Message text is empty");

      const langPair = data.sourceLang === 'hi' ? 'hi|fr' : 'fr|hi';
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(data.original)}&langpair=${langPair}`);
      
      if (!response.ok) throw new Error("Translation API failed");
      
      const translationData = await response.json();
      const translatedText = translationData.responseData.translatedText;
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const finalMessage = {
        id: Date.now(),
        sender: socket.id,
        original: data.original,
        translated: translatedText,
        time: timeString
      };

      const dbMessage = new Message({
        roomId: data.roomId,
        senderId: socket.id,
        originalText: data.original,
        translatedText: translatedText
      });
      await dbMessage.save();

      io.to(data.roomId).emit('receiveMessage', finalMessage);

    } catch (error) {
      socket.emit('serverError', error.message);
    }
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
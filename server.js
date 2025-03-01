// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tmi = require('tmi.js');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static('public'));

// Log when a client connects via Socket.IO
io.on('connection', (socket) => {
  console.log('A client connected');
  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

/* --- Twitch Chat Integration --- */
const twitchOptions = {
  options: { debug: true },
  connection: { reconnect: true },
  channels: ['your_twitch_channel'] // Replace with your Twitch channel name
};

const twitchClient = new tmi.Client(twitchOptions);

twitchClient.connect().catch(console.error);

twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return; // Ignore messages from the bot itself
  const chatMessage = {
    platform: 'Twitch',
    username: tags['display-name'] || tags.username,
    message: message,
    timestamp: new Date().toISOString()
  };
  io.emit('chatMessage', chatMessage);
});

/* --- YouTube Chat Integration (Polling) --- */
// YouTube requires an API key and the liveChatId for the current stream.
// Replace 'YOUR_YOUTUBE_API_KEY' and 'YOUR_LIVE_CHAT_ID' with actual values.
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';
const liveChatId = 'YOUR_LIVE_CHAT_ID'; 
let nextPageToken = null;

async function pollYouTubeChat() {
  try {
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${YOUTUBE_API_KEY}`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;
    const response = await axios.get(url);
    const data = response.data;
    nextPageToken = data.nextPageToken;
    const pollingInterval = data.pollingIntervalMillis || 5000;

    data.items.forEach(item => {
      const snippet = item.snippet;
      const authorDetails = item.authorDetails;
      const chatMessage = {
        platform: 'YouTube',
        username: authorDetails.displayName,
        message: snippet.displayMessage,
        timestamp: snippet.publishedAt
      };
      io.emit('chatMessage', chatMessage);
    });

    setTimeout(pollYouTubeChat, pollingInterval);
  } catch (error) {
    console.error('YouTube poll error:', error);
    setTimeout(pollYouTubeChat, 10000); // Retry after 10 seconds on error
  }
}

// Uncomment the line below when you have valid YouTube credentials
// pollYouTubeChat();

/* --- Kick Chat Integration (Simulation) --- */
function simulateKickChat() {
  const chatMessage = {
    platform: 'Kick',
    username: 'KickUser',
    message: 'This is a simulated Kick chat message.',
    timestamp: new Date().toISOString()
  };
  io.emit('chatMessage', chatMessage);
}
setInterval(simulateKickChat, 10000); // every 10 seconds

/* --- Aparat Chat Integration (Simulation) --- */
function simulateAparatChat() {
  const chatMessage = {
    platform: 'Aparat',
    username: 'AparatUser',
    message: 'This is a simulated Aparat chat message.',
    timestamp: new Date().toISOString()
  };
  io.emit('chatMessage', chatMessage);
}
setInterval(simulateAparatChat, 15000); // every 15 seconds

// Start the server on port 3000 or the environment's port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

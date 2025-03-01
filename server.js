// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tmi = require('tmi.js');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Global configuration for the current user/session
let userConfig = {
  twitch: '',
  youtube: '',
  kick: '',
  aparat: ''
};

let youtubeLiveChatId = '';
let nextPageToken = null;

// Serve static files from the 'public' folder
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A client connected');

  // Listen for configuration updates from the client
  socket.on('updateConfig', (config) => {
    userConfig = config;
    console.log('Updated config:', config);

    // Twitch: join the specified channel if provided
    if (config.twitch) {
      twitchClient.join(config.twitch).catch(console.error);
    }

    // YouTube: update the live chat ID and reset polling state
    if (config.youtube) {
      youtubeLiveChatId = config.youtube;
      nextPageToken = null;
    } else {
      youtubeLiveChatId = '';
    }
  });

  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

/* --- Twitch Chat Integration --- */
const twitchOptions = {
  options: { debug: true },
  connection: { reconnect: true },
  channels: [] // Start with no channel; we'll join after config update
};

const twitchClient = new tmi.Client(twitchOptions);
twitchClient.connect().catch(console.error);

twitchClient.on('message', (channel, tags, message, self) => {
  if (self) return; // Skip messages from the bot itself
  const chatMessage = {
    platform: 'Twitch',
    username: tags['display-name'] || tags.username,
    message: message,
    timestamp: new Date().toISOString()
  };
  io.emit('chatMessage', chatMessage);
});

/* --- YouTube Chat Integration (Polling) --- */
async function pollYouTubeChat() {
  // If no YouTube live chat ID is configured, try again later
  if (!youtubeLiveChatId) {
    return setTimeout(pollYouTubeChat, 5000);
  }
  try {
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${youtubeLiveChatId}&part=snippet,authorDetails&key=YOUR_YOUTUBE_API_KEY`;
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
    setTimeout(pollYouTubeChat, 10000);
  }
}
pollYouTubeChat();

/* --- Kick Chat Integration (Simulation) --- */
function simulateKickChat() {
  const chatMessage = {
    platform: 'Kick',
    username: userConfig.kick || 'KickUser',
    message: 'Simulated Kick chat message.',
    timestamp: new Date().toISOString()
  };
  io.emit('chatMessage', chatMessage);
}
setInterval(simulateKickChat, 10000);

/* --- Aparat Chat Integration (Simulation) --- */
function simulateAparatChat() {
  const chatMessage = {
    platform: 'Aparat',
    username: userConfig.aparat || 'AparatUser',
    message: 'Simulated Aparat chat message.',
    timestamp: new Date().toISOString()
  };
  io.emit('chatMessage', chatMessage);
}
setInterval(simulateAparatChat, 15000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

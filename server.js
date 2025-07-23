// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const dataDir = path.join(__dirname, 'public', 'data');
const paths = {
  users: path.join(dataDir, 'users.json'),
  tasks: path.join(dataDir, 'tasks.json'),
  messages: path.join(dataDir, 'messages.json'),
};

// Helpers to read and save JSON files
function readData(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.get('/api/users', (req, res) => res.json(readData(paths.users)));
app.get('/api/tasks', (req, res) => res.json(readData(paths.tasks)));
app.get('/api/messages', (req, res) => res.json(readData(paths.messages)));

app.post('/api/users', (req, res) => {
  const users = readData(paths.users);
  users.push(req.body);
  saveData(paths.users, users);
  io.emit('updateUsers', users);
  res.status(201).json({ message: 'User added' });
});

app.post('/api/tasks', (req, res) => {
  const tasks = readData(paths.tasks);
  tasks.push(req.body);
  saveData(paths.tasks, tasks);
  io.emit('updateTasks', tasks);
  res.status(201).json({ message: 'Task added' });
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readData(paths.tasks);
  const taskId = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  tasks[index] = { ...tasks[index], ...req.body };
  saveData(paths.tasks, tasks);
  io.emit('updateTasks', tasks);
  res.json({ message: 'Task updated' });
});

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = readData(paths.tasks);
  const taskId = parseInt(req.params.id);
  tasks = tasks.filter(t => t.id !== taskId);
  saveData(paths.tasks, tasks);
  io.emit('updateTasks', tasks);
  res.json({ message: 'Task deleted' });
});

app.post('/api/messages', (req, res) => {
  const messages = readData(paths.messages);
  messages.push(req.body);
  saveData(paths.messages, messages);
  io.emit('updateMessages', messages);
  res.status(201).json({ message: 'Message added' });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

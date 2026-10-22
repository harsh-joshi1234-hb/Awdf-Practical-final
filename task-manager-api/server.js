require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const taskEvents = require('./events');
require('./listeners');

const cache = new NodeCache({ stdTTL: 60 });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task-manager';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  }
});

const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Task = mongoose.model('Task', taskSchema);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

function requireJsonContentType(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      error: 'Content-Type must be application/json',
    });
  }
  return next();
}

function validateTaskId(req, res, next) {
  const taskId = req.params.id;
  if (!mongoose.isValidObjectId(taskId)) {
    return res.status(400).json({
      error: 'Task id must be a valid MongoDB ObjectId',
    });
  }
  req.taskId = taskId;
  return next();
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
}

function validateTaskInput(req, res, next) {
  const { title, description } = req.body;
  if (req.method === 'POST') {
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required and must be a non-empty string' });
    }
  } else if (req.method === 'PUT') {
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'title must be a non-empty string when provided' });
    }
  }
  
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string when provided' });
  }
  next();
}

app.get('/', (req, res) => {
  return res.status(200).json({
    message: 'Task Manager API',
    routes: {
      tasks: '/tasks',
      createTask: 'POST /tasks',
      updateTask: 'PUT /tasks/:id',
      deleteTask: 'DELETE /tasks/:id',
      register: 'POST /register',
      login: 'POST /login',
      me: 'GET /me'
    },
  });
});

app.post('/register', requireJsonContentType, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });
    return res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    return next(error);
  }
});

app.post('/login', requireJsonContentType, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
});

app.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
});

app.get('/tasks', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `all_tasks_${req.user.id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    cache.set(cacheKey, tasks);
    return res.status(200).json(tasks);
  } catch (error) {
    return next(error);
  }
});

app.post('/tasks', authMiddleware, requireJsonContentType, validateTaskInput, async (req, res, next) => {
  try {
    const { title, description = '', completed = false } = req.body;
    const newTask = await Task.create({
      userId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      completed: Boolean(completed),
    });
    cache.del(`all_tasks_${req.user.id}`);
    
    console.log(`[API] Response sent at ${new Date().toISOString()}`);
    res.status(201).json(newTask);

    // Asynchronous background notification (non-blocking)
    taskEvents.emit('task-created', { task: newTask, user: req.user });
    return;
  } catch (error) {
    return next(error);
  }
});

app.put('/tasks/:id', authMiddleware, validateTaskId, requireJsonContentType, validateTaskInput, async (req, res, next) => {
  try {
    const { title, description, completed } = req.body;
    const task = await Task.findOne({ _id: req.taskId, userId: req.user.id });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (completed !== undefined) task.completed = Boolean(completed);

    await task.save();
    cache.del(`all_tasks_${req.user.id}`);
    return res.status(200).json(task);
  } catch (error) {
    return next(error);
  }
});

app.delete('/tasks/:id', authMiddleware, validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.taskId, userId: req.user.id });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    cache.del(`all_tasks_${req.user.id}`);

    console.log(`[API] Response sent at ${new Date().toISOString()}`);
    res.status(200).json({ message: 'Task deleted successfully', task });

    // Asynchronous background notification (non-blocking)
    taskEvents.emit('task-deleted', { task, user: req.user });
    return;
  } catch (error) {
    return next(error);
  }
});

app.use((req, res) => {
  return res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON body. Please send valid JSON.',
    });
  }
  console.error(err.stack);
  return res.status(500).json({ error: 'Something went wrong' });
});

if (require.main === module) {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection failed:', err);
      process.exit(1);
    });
}

module.exports = app;
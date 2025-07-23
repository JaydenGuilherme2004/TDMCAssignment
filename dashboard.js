// public/dashboard.js
const socket = io(); // Connect Socket.IO

class TaskManager {
  constructor() {
    this.currentUser = null;
    this.users = [];
    this.tasks = [];
    this.messages = [];
    this.currentTaskId = null;
    this.editingTaskId = null;
    this.onlineUsers = new Set();

    this.initializeApp();
  }

  async initializeApp() {
    // Load initial data from backend
    await this.fetchInitialData();

    // Setup UI event listeners
    this.setupEventListeners();

    // Show auth modal
    this.showAuthModal();

    // Setup Socket.IO listeners for real-time updates
    this.setupSocketListeners();
  }

  async fetchInitialData() {
    try {
      const [usersRes, tasksRes, messagesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
        fetch('/api/messages'),
      ]);
      this.users = await usersRes.json();
      this.tasks = await tasksRes.json();
      this.messages = await messagesRes.json();
    } catch (err) {
      console.error('Failed to load data:', err);
      alert('Failed to load initial data from server.');
    }
  }

  setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('task-form').addEventListener('submit', (e) => this.handleCreateTask(e));
    document.getElementById('edit-task-form').addEventListener('submit', (e) => this.handleEditTask(e));
    document.getElementById('status-filter').addEventListener('change', () => this.filterTasks());
    document.getElementById('search-input').addEventListener('input', () => this.filterTasks());

    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });
  }

  setupSocketListeners() {
    socket.on('updateUsers', (users) => {
      this.users = users;
      if (this.currentUser && !users.find(u => u.email === this.currentUser.email)) {
        alert('You have been removed by admin. Logging out.');
        this.logout();
        return;
      }
      this.populateUserDropdowns();
    });

    socket.on('updateTasks', (tasks) => {
      this.tasks = tasks;
      this.renderTasks();
      this.updateStats();
      if (this.currentTaskId) this.viewTask(this.currentTaskId);
    });

    socket.on('updateMessages', (messages) => {
      this.messages = messages;
      if (this.currentTaskId) this.loadTaskMessages(this.currentTaskId);
    });
  }

  showAuthModal() {
    document.getElementById('auth-modal').style.display = 'block';
    document.getElementById('main-app').style.display = 'none';
  }

  showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
  }

  showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const user = this.users.find(u => u.email === email && u.password === password);
    if (user) {
      this.currentUser = user;
      this.onLogin();
    } else {
      this.showNotification('Invalid email or password', 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const role = document.getElementById('register-role').value;

    if (this.users.find(u => u.email === email)) {
      this.showNotification('Email already exists', 'error');
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role,
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        this.currentUser = newUser;
        this.users.push(newUser);
        this.onLogin();
        this.showNotification('Account created successfully!', 'success');
      } else {
        this.showNotification('Registration failed', 'error');
      }
    } catch {
      this.showNotification('Error connecting to server', 'error');
    }
  }

  onLogin() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('user-welcome').textContent = `Welcome, ${this.currentUser.name}`;

    this.populateUserDropdowns();
    this.renderTasks();
    this.updateStats();

    this.onlineUsers.add(this.currentUser.name);
    this.updateOnlineUsers();
  }

  logout() {
    this.onlineUsers.delete(this.currentUser.name);
    this.currentUser = null;
    this.showAuthModal();
    this.closeTaskModal();
    this.closeEditModal();
  }

  populateUserDropdowns() {
    const assignedToSelect = document.getElementById('assigned-to');
    const editAssignedToSelect = document.getElementById('edit-assigned-to');

    [assignedToSelect, editAssignedToSelect].forEach(select => {
      select.innerHTML = '<option value="">Select Employee</option>';
      this.users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.name;
        option.textContent = user.name;
        option.dataset.userId = user.id;
        select.appendChild(option);
      });
    });
  }

  async handleCreateTask(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const assignedToOption = document.querySelector('#assigned-to option:checked');

    const task = {
      id: Date.now(),
      title: formData.get('task-title'),
      description: formData.get('task-description'),
      assignedTo: formData.get('assigned-to'),
      assignedToId: parseInt(assignedToOption.dataset.userId),
      createdBy: this.currentUser.name,
      createdById: this.currentUser.id,
      priority: formData.get('priority'),
      status: 'pending',
      dueDate: formData.get('due-date'),
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        this.tasks.push(task);
        this.renderTasks();
        this.updateStats();
        e.target.reset();
        this.showNotification('Task created successfully!', 'success');
      } else {
        this.showNotification('Failed to create task', 'error');
      }
    } catch {
      this.showNotification('Error connecting to server', 'error');
    }
  }

  async handleEditTask(e) {
    e.preventDefault();
    const task = this.tasks.find(t => t.id === this.editingTaskId);
    if (!task) return;

    const assignedToOption = document.querySelector('#edit-assigned-to option:checked');

    const updatedTask = {
      title: document.getElementById('edit-task-title').value,
      description: document.getElementById('edit-task-description').value,
      assignedTo: document.getElementById('edit-assigned-to').value,
      assignedToId: parseInt(assignedToOption.dataset.userId),
      priority: document.getElementById('edit-priority').value,
      dueDate: document.getElementById('edit-due-date').value,
    };

    try {
      const res = await fetch(`/api/tasks/${this.editingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      });
      if (res.ok) {
        Object.assign(task, updatedTask);
        this.renderTasks();
        this.updateStats();
        this.closeEditModal();
        this.showNotification('Task updated successfully!', 'success');
      } else {
        this.showNotification('Failed to update task', 'error');
      }
    } catch {
      this.showNotification('Error connecting to server', 'error');
    }
  }

  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.renderTasks();
        this.updateStats();
        this.showNotification('Task deleted successfully!', 'success');
      } else {
        this.showNotification('Failed to delete task', 'error');
      }
    } catch {
      this.showNotification('Error connecting to server', 'error');
    }
  }

  editTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    this.editingTaskId = taskId;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description;
    document.getElementById('edit-assigned-to').value = task.assignedTo;
    document.getElementById('edit-priority').value = task.priority;
    document.getElementById('edit-due-date').value = task.dueDate;

    document.getElementById('edit-task-modal').style.display = 'block';
  }

  viewTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    this.currentTaskId = taskId;
    document.getElementById('modal-task-title').textContent = task.title;

    const taskDetails = document.getElementById('task-details');
    taskDetails.innerHTML = `
      <h3>${task.title}</h3>
      <p>${task.description}</p>
      <div class="task-meta-item"><span>Assigned to:</span> <strong>${task.assignedTo}</strong></div>
      <div class="task-meta-item"><span>Created by:</span> <strong>${task.createdBy}</strong></div>
      <div class="task-meta-item"><span>Priority:</span> <span class="priority ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span></div>
      <div class="task-meta-item"><span>Status:</span> <span class="status ${task.status}">${task.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></div>
      <div class="task-meta-item"><span>Due Date:</span> <strong>${new Date(task.dueDate).toLocaleDateString()}</strong></div>
      <div class="task-meta-item"><span>Created:</span> <strong>${new Date(task.createdAt).toLocaleString()}</strong></div>
    `;

    document.getElementById('status-update').value = task.status;

    this.loadTaskMessages(taskId);
    document.getElementById('task-detail-modal').style.display = 'block';
  }

  closeTaskModal() {
    document.getElementById('task-detail-modal').style.display = 'none';
    this.currentTaskId = null;
  }

  closeEditModal() {
    document.getElementById('edit-task-modal').style.display = 'none';
    this.editingTaskId = null;
  }

  async updateTaskStatus() {
    if (!this.currentTaskId) return;
    const newStatus = document.getElementById('status-update').value;
    const task = this.tasks.find(t => t.id === this.currentTaskId);
    if (!task) return;

    try {
      const res = await fetch(`/api/tasks/${this.currentTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        task.status = newStatus;
        this.renderTasks();
        this.updateStats();
        this.viewTask(this.currentTaskId);
        this.showNotification('Task status updated!', 'success');
      } else {
        this.showNotification('Failed to update status', 'error');
      }
    } catch {
      this.showNotification('Error connecting to server', 'error');
    }
  }

  loadTaskMessages(taskId) {
    const chatMessagesContainer = document.getElementById('chat-messages');
    chatMessagesContainer.innerHTML = '';

    const messages = this.messages.filter(m => m.taskId === taskId);
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.classList.add('chat-message');
      div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
      chatMessagesContainer.appendChild(div);
    });
  }

  async sendMessage() {
    if (!this.currentTaskId) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const message = {
      id: Date.now(),
      taskId: this.currentTaskId,
      user: this.currentUser.name,
      text,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (res.ok) {
        this.messages.push(message);
        this.loadTaskMessages(this.currentTaskId);
        input.value = '';
      } else {
        this.showNotification('Failed to send message', 'error');
      }
    } catch {
      this.showNotification('Error connecting to server', 'error');
    }
  }

  handleChatKeyPress(e) {
    if (e.key === 'Enter') {
      this.sendMessage();
    }
  }

  renderTasks() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';

    // Apply current filter & search
    const filter = document.getElementById('status-filter').value;
    const search = document.getElementById('search-input').value.toLowerCase();

    let filteredTasks = this.tasks;
    if (filter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.status === filter || (filter === 'pending' && t.status === 'pending'));
    }

    filteredTasks = filteredTasks.filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search) ||
      t.assignedTo.toLowerCase().includes(search)
    );

    filteredTasks.forEach(task => {
      const div = document.createElement('div');
      div.classList.add('task-card');
      div.innerHTML = `
        <h3>${task.title}</h3>
        <p>${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</p>
        <div class="task-meta">
          <span><strong>Assigned to:</strong> ${task.assignedTo}</span>
          <span><strong>Status:</strong> ${task.status}</span>
          <span><strong>Priority:</strong> ${task.priority}</span>
          <span><strong>Due:</strong> ${new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
        <div class="task-actions">
          <button onclick="taskManager.viewTask(${task.id})">View</button>
          <button onclick="taskManager.editTask(${task.id})">Edit</button>
          <button onclick="taskManager.deleteTask(${task.id})">Delete</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  updateStats() {
    const total = this.tasks.length;
    const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const overdue = this.tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== 'completed';
    }).length;

    document.getElementById('total-tasks').textContent = total;
    document.getElementById('in-progress-tasks').textContent = inProgress;
    document.getElementById('completed-tasks').textContent = completed;
    document.getElementById('overdue-tasks').textContent = overdue;
  }

  filterTasks() {
    this.renderTasks();
  }

  updateOnlineUsers() {
    const container = document.getElementById('online-users');
    container.innerHTML = '';
    this.onlineUsers.forEach(name => {
      const span = document.createElement('span');
      span.textContent = name;
      span.classList.add('online-user');
      container.appendChild(span);
    });
  }

  // Demo quick login buttons
  quickLogin(email, name) {
    const user = this.users.find(u => u.email === email);
    if (user) {
      this.currentUser = user;
      this.onLogin();
    } else {
      alert('Demo user not found');
    }
  }

  showNotification(msg, type = 'info') {
    alert(msg); // Simple alert for now. You can replace with a nicer UI toast.
  }
}

const taskManager = new TaskManager();

// Expose some methods to global scope for inline HTML handlers
window.showLogin = () => taskManager.showLogin();
window.showRegister = () => taskManager.showRegister();
window.logout = () => taskManager.logout();
window.quickLogin = (email, name) => taskManager.quickLogin(email, name);
window.closeTaskModal = () => taskManager.closeTaskModal();
window.closeEditModal = () => taskManager.closeEditModal();
window.handleChatKeyPress = (e) => taskManager.handleChatKeyPress(e);
window.sendMessage = () => taskManager.sendMessage();
window.updateTaskStatus = () => taskManager.updateTaskStatus();

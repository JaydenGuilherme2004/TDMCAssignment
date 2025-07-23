// Task Management System with Chat Functionality
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.tasks = this.loadTasks();
        this.messages = this.loadMessages();
        this.currentTaskId = null;
        this.editingTaskId = null;
        this.onlineUsers = new Set();
        
        this.initializeApp();
        this.simulateOnlineUsers();
    }

    // Initialize the application
    initializeApp() {
        this.showAuthModal();
        this.setupEventListeners();
        this.loadSampleData();
    }

    // Load sample data if none exists
    loadSampleData() {
        if (this.users.length === 0) {
            this.users = [
                { id: 1, name: 'Admin User', email: 'admin@demo.com', role: 'admin', password: 'demo123' },
                { id: 2, name: 'John Smith', email: 'john@demo.com', role: 'employee', password: 'demo123' },
                { id: 3, name: 'Sarah Johnson', email: 'sarah@demo.com', role: 'manager', password: 'demo123' },
                { id: 4, name: 'Mike Davis', email: 'mike@demo.com', role: 'employee', password: 'demo123' },
                { id: 5, name: 'Lisa Wilson', email: 'lisa@demo.com', role: 'employee', password: 'demo123' }
            ];
            this.saveUsers();
        }

        if (this.tasks.length === 0) {
            this.tasks = [
                {
                    id: 1,
                    title: 'Update website design',
                    description: 'Redesign the homepage layout and improve user experience',
                    assignedTo: 'John Smith',
                    assignedToId: 2,
                    createdBy: 'Admin User',
                    createdById: 1,
                    priority: 'high',
                    status: 'in-progress',
                    dueDate: '2025-07-30',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    title: 'Database backup',
                    description: 'Perform weekly database backup and verify data integrity',
                    assignedTo: 'Sarah Johnson',
                    assignedToId: 3,
                    createdBy: 'Admin User',
                    createdById: 1,
                    priority: 'medium',
                    status: 'pending',
                    dueDate: '2025-07-25',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveTasks();
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => this.handleCreateTask(e));
        document.getElementById('edit-task-form').addEventListener('submit', (e) => this.handleEditTask(e));
        
        // Filters and search
        document.getElementById('status-filter').addEventListener('change', () => this.filterTasks());
        document.getElementById('search-input').addEventListener('input', () => this.filterTasks());
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    // Authentication methods
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

    quickLogin(email, name) {
        const user = this.users.find(u => u.email === email);
        if (user) {
            this.currentUser = user;
            this.onLogin();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const user = this.users.find(u => u.email === email && u.password === password);
        if (user) {
            this.currentUser = user;
            this.onLogin();
        } else {
            this.showNotification('Invalid email or password', 'error');
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
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
            role
        };
        
        this.users.push(newUser);
        this.saveUsers();
        this.currentUser = newUser;
        this.onLogin();
        this.showNotification('Account created successfully!', 'success');
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

    // User management
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

    // Task management
    handleCreateTask(e) {
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
            createdAt: new Date().toISOString()
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        e.target.reset();
        this.showNotification('Task created successfully!', 'success');
    }

    handleEditTask(e) {
        e.preventDefault();
        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (!task) return;
        
        const assignedToOption = document.querySelector('#edit-assigned-to option:checked');
        
        task.title = document.getElementById('edit-task-title').value;
        task.description = document.getElementById('edit-task-description').value;
        task.assignedTo = document.getElementById('edit-assigned-to').value;
        task.assignedToId = parseInt(assignedToOption.dataset.userId);
        task.priority = document.getElementById('edit-priority').value;
        task.dueDate = document.getElementById('edit-due-date').value;
        
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.closeEditModal();
        this.showNotification('Task updated successfully!', 'success');
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task deleted successfully!', 'success');
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
            <div class="task-meta-item">
                <span>Assigned to:</span>
                <strong>${task.assignedTo}</strong>
            </div>
            <div class="task-meta-item">
                <span>Created by:</span>
                <strong>${task.createdBy}</strong>
            </div>
            <div class="task-meta-item">
                <span>Priority:</span>
                <span class="priority ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
            </div>
            <div class="task-meta-item">
                <span>Status:</span>
                <span class="status ${task.status}">${task.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
            <div class="task-meta-item">
                <span>Due Date:</span>
                <strong>${new Date(task.dueDate).toLocaleDateString()}</strong>
            </div>
            <div class="task-meta-item">
                <span>Created:</span>
                <strong>${new Date(task.createdAt).toLocaleDateString()}</strong>
            </div>
        `;
        
        document.getElementById('status-update').value = task.status;
        this.loadTaskMessages(taskId);
        document.getElementById('task-detail-modal').style.display = 'block';
    }

    updateTaskStatus() {
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;
        
        const newStatus = document.getElementById('status-update').value;
        const oldStatus = task.status;
        task.status = newStatus;
        
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        
        // Add system message about status change
        this.addSystemMessage(this.currentTaskId, `Task status changed from "${oldStatus.replace('-', ' ')}" to "${newStatus.replace('-', ' ')}" by ${this.currentUser.name}`);
        
        // Update task details display
        this.viewTask(this.currentTaskId);
        this.showNotification('Task status updated!', 'success');
    }

    // Chat functionality
    loadTaskMessages(taskId) {
        const taskMessages = this.messages.filter(m => m.taskId === taskId);
        const chatMessages = document.getElementById('chat-messages');
        
        chatMessages.innerHTML = '';
        taskMessages.forEach(message => {
            this.displayMessage(message);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        
        if (!content || !this.currentTaskId) return;
        
        const message = {
            id: Date.now(),
            taskId: this.currentTaskId,
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            content: content,
            timestamp: new Date().toISOString(),
            type: 'user'
        };
        
        this.messages.push(message);
        this.saveMessages();
        this.displayMessage(message);
        
        input.value = '';
        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
    }

    addSystemMessage(taskId, content) {
        const message = {
            id: Date.now(),
            taskId: taskId,
            userId: 0,
            userName: 'System',
            content: content,
            timestamp: new Date().toISOString(),
            type: 'system'
        };
        
        this.messages.push(message);
        this.saveMessages();
        
        if (this.currentTaskId === taskId) {
            this.displayMessage(message);
            document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
        }
    }

    displayMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        const isOwnMessage = message.userId === this.currentUser?.id;
        const isSystemMessage = message.type === 'system';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-author" style="${isSystemMessage ? 'color: #ffc107;' : ''}">${message.userName}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content ${isOwnMessage ? 'own-message' : ''} ${isSystemMessage ? 'system-message' : ''}">
                ${message.content}
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
    }

    handleChatKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    // Online users simulation
    simulateOnlineUsers() {
        // Simulate random users coming online/offline
        setInterval(() => {
            const allUsers = this.users.map(u => u.name);
            const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
            
            if (this.onlineUsers.has(randomUser)) {
                if (randomUser !== this.currentUser?.name && Math.random() > 0.7) {
                    this.onlineUsers.delete(randomUser);
                }
            } else {
                if (Math.random() > 0.6) {
                    this.onlineUsers.add(randomUser);
                }
            }
            
            this.updateOnlineUsers();
        }, 5000);
    }

    updateOnlineUsers() {
        const onlineUsersDiv = document.getElementById('online-users');
        if (!onlineUsersDiv) return;
        
        onlineUsersDiv.innerHTML = '';
        this.onlineUsers.forEach(userName => {
            const userSpan = document.createElement('span');
            userSpan.className = 'online-user';
            userSpan.innerHTML = `<span class="online-dot"></span>${userName}`;
            onlineUsersDiv.appendChild(userSpan);
        });
    }

    // Rendering and filtering
    renderTasks() {
        const taskList = document.getElementById('task-list');
        const filteredTasks = this.getFilteredTasks();
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No tasks found</div>';
            return;
        }
        
        taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-item" onclick="taskManager.viewTask(${task.id})">
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                    <div class="task-meta">
                        <span class="assigned-to">Assigned to: ${task.assignedTo}</span>
                        <span class="due-date">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="task-status">
                    <span class="priority ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                    <span class="status ${task.status}">${task.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>
                <div class="task-actions" onclick="event.stopPropagation()">
                    <button class="btn-edit" onclick="taskManager.editTask(${task.id})">Edit</button>
                    <button class="btn-delete" onclick="taskManager.deleteTask(${task.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];
        
        // Filter by status
        const statusFilter = document.getElementById('status-filter').value;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(task => task.status === statusFilter);
        }
        
        // Filter by search term
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                task.assignedTo.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    filterTasks() {
        this.renderTasks();
    }

    updateStats() {
        const total = this.tasks.length;
        const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const overdue = this.tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
        
        document.getElementById('total-tasks').textContent = total;
        document.getElementById('in-progress-tasks').textContent = inProgress;
        document.getElementById('completed-tasks').textContent = completed;
        document.getElementById('overdue-tasks').textContent = overdue;
    }

    // Modal management
    closeTaskModal() {
        document.getElementById('task-detail-modal').style.display = 'none';
        this.currentTaskId = null;
    }

    closeEditModal() {
        document.getElementById('edit-task-modal').style.display = 'none';
        this.editingTaskId = null;
    }

    // Utility methods
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Data persistence (using localStorage as fallback)
    loadUsers() {
        const stored = localStorage.getItem('taskManager_users');
        return stored ? JSON.parse(stored) : [];
    }

    saveUsers() {
        localStorage.setItem('taskManager_users', JSON.stringify(this.users));
    }

    loadTasks() {
        const stored = localStorage.getItem('taskManager_tasks');
        return stored ? JSON.parse(stored) : [];
    }

    saveTasks() {
        localStorage.setItem('taskManager_tasks', JSON.stringify(this.tasks));
    }

    loadMessages() {
        const stored = localStorage.getItem('taskManager_messages');
        return stored ? JSON.parse(stored) : [];
    }

    saveMessages() {
        localStorage.setItem('taskManager_messages', JSON.stringify(this.messages));
    }
}

// Global functions for HTML event handlers
function showLogin() {
    taskManager.showLogin();
}

function showRegister() {
    taskManager.showRegister();
}

function quickLogin(email, name) {
    taskManager.quickLogin(email, name);
}

function logout() {
    taskManager.logout();
}

function closeTaskModal() {
    taskManager.closeTaskModal();
}

function closeEditModal() {
    taskManager.closeEditModal();
}

function updateTaskStatus() {
    taskManager.updateTaskStatus();
}

function sendMessage() {
    taskManager.sendMessage();
}

function handleChatKeyPress(event) {
    taskManager.handleChatKeyPress(event);
}

// Initialize the application
const taskManager = new TaskManager();
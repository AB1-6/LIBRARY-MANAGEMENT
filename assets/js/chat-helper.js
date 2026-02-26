/**
 * Chat Support Module
 * Real-time chat between students and librarians
 */

const ChatHelper = {
    // Get all chat messages
    getAllMessages: function() {
        return LibraryStore.load(LibraryStore.KEYS.chat || 'lib_chat', []);
    },

    // Get messages for a specific conversation
    getMessages: function(senderId, receiverId) {
        const allMessages = this.getAllMessages();
        return allMessages.filter(msg => 
            (msg.senderId === senderId && msg.receiverId === receiverId) ||
            (msg.senderId === receiverId && msg.receiverId === senderId)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    // Get messages for librarian (all student messages)
    getLibrarianMessages: function() {
        const allMessages = this.getAllMessages();
        // Group by student
        const grouped = {};
        allMessages.forEach(msg => {
            const studentId = msg.senderRole === 'student' ? msg.senderId : msg.receiverId;
            if (!grouped[studentId]) {
                grouped[studentId] = [];
            }
            grouped[studentId].push(msg);
        });
        
        // Sort each conversation by timestamp
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        
        return grouped;
    },

    // Send a message
    sendMessage: function(senderId, senderRole, receiverId, receiverRole, message) {
        if (!message || !message.trim()) {
            return { success: false, message: 'Message cannot be empty' };
        }

        const messages = this.getAllMessages();
        
        const newMessage = {
            id: 'MSG' + Date.now(),
            senderId: senderId,
            senderRole: senderRole,
            receiverId: receiverId || 'librarian', // Default to librarian
            receiverRole: receiverRole || 'librarian',
            message: message.trim(),
            timestamp: new Date().toISOString(),
            read: false
        };

        messages.push(newMessage);
        LibraryStore.save(LibraryStore.KEYS.chat || 'lib_chat', messages);

        return { success: true, message: 'Message sent', data: newMessage };
    },

    // Mark messages as read
    markAsRead: function(senderId, receiverId) {
        const messages = this.getAllMessages();
        let updated = false;
        
        messages.forEach(msg => {
            if (msg.senderId === senderId && msg.receiverId === receiverId && !msg.read) {
                msg.read = true;
                updated = true;
            }
        });

        if (updated) {
            LibraryStore.save(LibraryStore.KEYS.chat || 'lib_chat', messages);
        }

        return { success: true };
    },

    // Get unread message count
    getUnreadCount: function(userId) {
        const messages = this.getAllMessages();
        return messages.filter(msg => msg.receiverId === userId && !msg.read).length;
    },

    // Get unread count by sender
    getUnreadBySender: function(userId) {
        const messages = this.getAllMessages();
        const unreadCounts = {};
        
        messages.forEach(msg => {
            if (msg.receiverId === userId && !msg.read) {
                unreadCounts[msg.senderId] = (unreadCounts[msg.senderId] || 0) + 1;
            }
        });
        
        return unreadCounts;
    },

    // Delete a message
    deleteMessage: function(messageId) {
        let messages = this.getAllMessages();
        messages = messages.filter(msg => msg.id !== messageId);
        LibraryStore.save(LibraryStore.KEYS.chat || 'lib_chat', messages);
        
        return { success: true, message: 'Message deleted' };
    },

    // Clear conversation
    clearConversation: function(userId1, userId2) {
        let messages = this.getAllMessages();
        messages = messages.filter(msg => 
            !((msg.senderId === userId1 && msg.receiverId === userId2) ||
              (msg.senderId === userId2 && msg.receiverId === userId1))
        );
        LibraryStore.save(LibraryStore.KEYS.chat || 'lib_chat', messages);
        
        return { success: true, message: 'Conversation cleared' };
    }
};

// Chat UI Component
const ChatUI = {
    isOpen: false,
    currentReceiver: null,
    currentReceiverRole: null,
    pollInterval: null,

    // Initialize chat UI
    init: function(userRole) {
        // Add chat CSS
        if (!document.getElementById('chatStyles')) {
            const style = document.createElement('style');
            style.id = 'chatStyles';
            style.textContent = `
                .chat-widget {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 9999;
                }
                .chat-toggle-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    position: relative;
                }
                .chat-toggle-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.4);
                }
                .chat-toggle-btn .unread-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #f44336;
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                }
                .chat-window {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: 350px;
                    height: 500px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    z-index: 9998;
                }
                .chat-window.open {
                    display: flex;
                }
                .chat-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .chat-header h3 {
                    margin: 0;
                    font-size: 16px;
                }
                .chat-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .chat-close-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    background: #f5f5f5;
                }
                .chat-message {
                    margin-bottom: 12px;
                    display: flex;
                    flex-direction: column;
                    max-width: 80%;
                    animation: slideIn 0.3s ease;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .chat-message.sent {
                    align-self: flex-end;
                    align-items: flex-end;
                }
                .chat-message.received {
                    align-self: flex-start;
                    align-items: flex-start;
                }
                .chat-message-content {
                    padding: 10px 14px;
                    border-radius: 12px;
                    word-wrap: break-word;
                    font-size: 14px;
                }
                .chat-message.sent .chat-message-content {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .chat-message.received .chat-message-content {
                    background: white;
                    color: #333;
                }
                .chat-message-time {
                    font-size: 11px;
                    color: #999;
                    margin-top: 4px;
                }
                .chat-input-area {
                    padding: 15px;
                    background: white;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 10px;
                }
                .chat-input {
                    flex: 1;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    padding: 10px 15px;
                    font-size: 14px;
                    outline: none;
                }
                .chat-input:focus {
                    border-color: #667eea;
                }
                .chat-send-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    color: white;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    font-size: 18px;
                    transition: transform 0.2s;
                }
                .chat-send-btn:hover {
                    transform: scale(1.1);
                }
                .chat-empty {
                    text-align: center;
                    color: #999;
                    padding: 40px 20px;
                }
            `;
            document.head.appendChild(style);
        }

        // Create chat widget HTML
        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.innerHTML = `
            <button class="chat-toggle-btn" id="chatToggleBtn" title="Chat Support">
                💬
                <span class="unread-badge" id="chatUnreadBadge" style="display: none;"></span>
            </button>
            <div class="chat-window" id="chatWindow">
                <div class="chat-header">
                    <h3>${userRole === 'student' ? '💬 Chat with Librarian' : '💬 Student Support'}</h3>
                    <button class="chat-close-btn" id="chatCloseBtn">×</button>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-empty">No messages yet. Start a conversation!</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Type a message...">
                    <button class="chat-send-btn" id="chatSendBtn">➤</button>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        // Event listeners
        document.getElementById('chatToggleBtn').addEventListener('click', () => this.toggle());
        document.getElementById('chatCloseBtn').addEventListener('click', () => this.close());
        document.getElementById('chatSendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Start polling for new messages
        this.startPolling(userRole);
    },

    // Toggle chat window
    toggle: function() {
        const window = document.getElementById('chatWindow');
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            window.classList.add('open');
            this.loadMessages();
            document.getElementById('chatInput').focus();
        } else {
            window.classList.remove('open');
        }
    },

    // Close chat window
    close: function() {
        this.isOpen = false;
        document.getElementById('chatWindow').classList.remove('open');
    },

    // Load and display messages
    loadMessages: function() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.error('❌ Chat: No current user found');
            return;
        }

        console.log('✅ Chat: Current user:', currentUser);
        
        const allMessages = ChatHelper.getAllMessages();
        console.log('📨 Chat: All messages in storage:', allMessages);
        
        const messages = ChatHelper.getMessages(currentUser.id, 'librarian');
        console.log('💬 Chat: Filtered messages for user:', messages);

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="chat-empty">No messages yet. Start a conversation!</div>';
            return;
        }

        messagesContainer.innerHTML = '';
        messages.forEach(msg => {
            this.renderMessage(msg, currentUser.id);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mark messages as read
        ChatHelper.markAsRead('librarian', currentUser.id);
        this.updateUnreadBadge();
    },

    // Render a single message
    renderMessage: function(msg, currentUserId) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const isSent = msg.senderId === currentUserId;
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="chat-message-content">${this.escapeHtml(msg.message)}</div>
            <div class="chat-message-time">${time}</div>
        `;

        messagesContainer.appendChild(messageDiv);
    },

    // Send message
    sendMessage: function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.error('❌ Chat: Cannot send - no current user');
            return;
        }

        console.log('📤 Chat: Sending message from user:', currentUser);

        const result = ChatHelper.sendMessage(
            currentUser.id,
            currentUser.role,
            'librarian',
            'librarian',
            message
        );

        console.log('📤 Chat: Send result:', result);

        if (result.success) {
            input.value = '';
            this.loadMessages();
        }
    },

    // Get current user info
    getCurrentUser: function() {
        const email = localStorage.getItem('userEmail');
        const role = localStorage.getItem('userRole');
        
        if (role === 'student') {
            const members = LibraryStore.load(LibraryStore.KEYS.members, []);
            const member = members.find(m => m.email === email);
            return member ? { ...member, role: 'student' } : null;
        } else if (role === 'librarian') {
            return { id: 'librarian', role: 'librarian', name: 'Librarian' };
        }
        
        return null;
    },

    // Update unread badge
    updateUnreadBadge: function() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;

        const unreadCount = ChatHelper.getUnreadCount(currentUser.id);
        const badge = document.getElementById('chatUnreadBadge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // Start polling for new messages
    startPolling: function(userRole) {
        // Poll every 5 seconds
        this.pollInterval = setInterval(() => {
            if (!document.hidden) {
                this.updateUnreadBadge();
                if (this.isOpen) {
                    this.loadMessages();
                }
            }
        }, 5000);
    },

    // Escape HTML to prevent XSS
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make it globally available
if (typeof window !== 'undefined') {
    window.ChatHelper = ChatHelper;
    window.ChatUI = ChatUI;
}

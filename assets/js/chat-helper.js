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
    currentReceiverName: null,
    pollInterval: null,
    userRole: null,

    // Initialize chat UI
    init: function(userRole) {
        this.userRole = userRole;
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
                    width: 450px;
                    height: 500px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    display: none;
                    flex-direction: row;
                    overflow: hidden;
                    z-index: 9998;
                }
                .chat-window.open {
                    display: flex;
                }
                .chat-window.student-mode {
                    width: 350px;
                    flex-direction: column;
                }
                .chat-conversations-list {
                    width: 180px;
                    background: #f5f5f5;
                    border-right: 1px solid #ddd;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }
                .chat-window.student-mode .chat-conversations-list {
                    display: none;
                }
                .conversation-item {
                    padding: 12px 10px;
                    border-bottom: 1px solid #e0e0e0;
                    cursor: pointer;
                    transition: background 0.2s;
                    position: relative;
                }
                .conversation-item:hover {
                    background: #e8e8e8;
                }
                .conversation-item.active {
                    background: #667eea;
                    color: white;
                }
                .conversation-item.active .conv-name,
                .conversation-item.active .conv-preview {
                    color: white;
                }
                .conv-name {
                    font-weight: 600;
                    font-size: 13px;
                    margin-bottom: 3px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .conv-preview {
                    font-size: 11px;
                    color: #666;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .conv-unread {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #f44336;
                    color: white;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: bold;
                }
                .conversation-item.active .conv-unread {
                    background: white;
                    color: #667eea;
                }
                .chat-main-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
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
                .chat-header-buttons {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .chat-back-btn, .chat-close-btn {
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
                .chat-back-btn:hover, .chat-close-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    background: #ECE5DD;
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
                .chat-message-sender {
                    font-size: 11px;
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 3px;
                }
                .chat-message-content {
                    padding: 8px 12px;
                    border-radius: 8px;
                    word-wrap: break-word;
                    font-size: 14px;
                    box-shadow: 0 1px 1px rgba(0,0,0,0.1);
                    max-width: 100%;
                }
                .chat-message.sent .chat-message-content {
                    background: #DCF8C6;
                    color: #000;
                    border-radius: 8px 8px 0px 8px;
                }
                .chat-message.received .chat-message-content {
                    background: #FFFFFF;
                    color: #000;
                    border-radius: 8px 8px 8px 0px;
                    border: 1px solid #E5E5EA;
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
                .chat-select-prompt {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #999;
                    text-align: center;
                    padding: 20px;
                }
            `;
            document.head.appendChild(style);
        }

        // Create chat widget HTML
        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        
        if (userRole === 'student') {
            // Student view - simple single chat
            widget.innerHTML = `
                <button class="chat-toggle-btn" id="chatToggleBtn" title="Chat Support">
                    💬
                    <span class="unread-badge" id="chatUnreadBadge" style="display: none;"></span>
                </button>
                <div class="chat-window student-mode" id="chatWindow">
                    <div class="chat-main-area">
                        <div class="chat-header">
                            <h3>💬 Chat with Librarian</h3>
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
                </div>
            `;
        } else {
            // Librarian view - conversation list + chat
            widget.innerHTML = `
                <button class="chat-toggle-btn" id="chatToggleBtn" title="Chat Support">
                    💬
                    <span class="unread-badge" id="chatUnreadBadge" style="display: none;"></span>
                </button>
                <div class="chat-window" id="chatWindow">
                    <div class="chat-conversations-list" id="chatConversationsList">
                        <div class="chat-empty" style="padding: 20px 10px; font-size: 12px;">No conversations yet</div>
                    </div>
                    <div class="chat-main-area">
                        <div class="chat-header">
                            <h3 id="chatHeaderTitle">💬 Student Support</h3>
                            <button class="chat-close-btn" id="chatCloseBtn">×</button>
                        </div>
                        <div class="chat-messages" id="chatMessages">
                            <div class="chat-select-prompt">← Select a conversation to start chatting</div>
                        </div>
                        <div class="chat-input-area">
                            <input type="text" class="chat-input" id="chatInput" placeholder="Type a message...">
                            <button class="chat-send-btn" id="chatSendBtn">➤</button>
                        </div>
                    </div>
                </div>
            `;
        }

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
            if (this.userRole === 'librarian' || this.userRole === 'admin') {
                this.loadConversationList();
                // Load messages if a conversation is selected
                if (this.currentReceiver) {
                    this.loadMessages();
                }
            } else {
                this.loadMessages();
            }
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

    // Load conversation list for librarian
    loadConversationList: function() {
        const listContainer = document.getElementById('chatConversationsList');
        if (!listContainer) return;

        const allMessages = ChatHelper.getAllMessages();
        const currentUser = this.getCurrentUser();
        
        // Get users who sent messages
        const users = LibraryStore.load(LibraryStore.KEYS.users || 'lib_users', []);
        const members = LibraryStore.load(LibraryStore.KEYS.members || 'lib_members', []);
        
        // Group messages by student
        const conversationsMap = {};
        allMessages.forEach(msg => {
            const studentId = msg.senderRole === 'student' ? msg.senderId : 
                            (msg.receiverRole === 'student' ? msg.receiverId : null);
            
            if (studentId && studentId !== 'librarian') {
                if (!conversationsMap[studentId]) {
                    conversationsMap[studentId] = {
                        studentId: studentId,
                        messages: [],
                        unreadCount: 0
                    };
                }
                conversationsMap[studentId].messages.push(msg);
                
                // Count unread messages TO librarian FROM this student
                if (msg.receiverId === 'librarian' && !msg.read) {
                    conversationsMap[studentId].unreadCount++;
                }
            }
        });

        const conversations = Object.values(conversationsMap);
        
        if (conversations.length === 0) {
            listContainer.innerHTML = '<div class="chat-empty" style="padding: 20px 10px; font-size: 12px;">No conversations yet</div>';
            return;
        }

        // Sort by latest message
        conversations.sort((a, b) => {
            const aLast = a.messages[a.messages.length - 1];
            const bLast = b.messages[b.messages.length - 1];
            return new Date(bLast.timestamp) - new Date(aLast.timestamp);
        });

        listContainer.innerHTML = '';
        conversations.forEach(conv => {
            const user = users.find(u => u.id === conv.studentId);
            const member = members.find(m => m.id === user?.memberId);
            
            const studentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 
                              member ? member.name :
                              conv.studentId;
            
            const lastMsg = conv.messages[conv.messages.length - 1];
            const preview = lastMsg.message.substring(0, 30) + (lastMsg.message.length > 30 ? '...' : '');
            
            const convItem = document.createElement('div');
            convItem.className = 'conversation-item';
            if (this.currentReceiver === conv.studentId) {
                convItem.classList.add('active');
            }
            
            convItem.innerHTML = `
                <div class="conv-name">${studentName}</div>
                <div class="conv-preview">${this.escapeHtml(preview)}</div>
                ${conv.unreadCount > 0 ? `<div class="conv-unread">${conv.unreadCount}</div>` : ''}
            `;
            
            convItem.addEventListener('click', () => this.selectConversation(conv.studentId, studentName));
            listContainer.appendChild(convItem);
        });
        
        // Auto-select first conversation if none selected
        if (!this.currentReceiver && conversations.length > 0) {
            const firstConv = conversations[0];
            const user = users.find(u => u.id === firstConv.studentId);
            const member = members.find(m => m.id === user?.memberId);
            const studentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 
                              member ? member.name :
                              firstConv.studentId;
            // Set receiver without triggering full load to avoid loop
            this.currentReceiver = firstConv.studentId;
            this.currentReceiverRole = 'student';
            this.currentReceiverName = studentName;
            const header = document.getElementById('chatHeaderTitle');
            if (header) {
                header.textContent = `💬 ${studentName}`;
            }
        }
    },

    // Select a conversation
    selectConversation: function(studentId, studentName) {
        this.currentReceiver = studentId;
        this.currentReceiverRole = 'student';
        this.currentReceiverName = studentName;
        
        // Update header
        const header = document.getElementById('chatHeaderTitle');
        if (header) {
            header.textContent = `💬 ${studentName}`;
        }
        
        // Update active state in conversation list - will be refreshed by loadConversationList
        // which is called at the end of loadMessages
        
        // Load messages for this student
        this.loadMessages();
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
        
        let messages;
        let otherUserId = null; // Track the other user in conversation for markAsRead
        
        if (currentUser.role === 'student') {
            // Student sees conversation with librarian
            messages = ChatHelper.getMessages(currentUser.id, 'librarian');
            otherUserId = 'librarian';
        } else if (currentUser.role === 'librarian' || currentUser.role === 'admin') {
            // Librarian sees conversation with selected student
            if (!this.currentReceiver) {
                messagesContainer.innerHTML = '<div class="chat-select-prompt">← Select a conversation to start chatting</div>';
                return;
            }
            messages = ChatHelper.getMessages('librarian', this.currentReceiver);
            otherUserId = this.currentReceiver;
        }
        
        console.log('💬 Chat: Filtered messages for user:', messages);

        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = '<div class="chat-empty">No messages yet. Start a conversation!</div>';
            return;
        }

        messagesContainer.innerHTML = '';
        
        // Get user info for displaying names
        const users = LibraryStore.load(LibraryStore.KEYS.users || 'lib_users', []);
        const members = LibraryStore.load(LibraryStore.KEYS.members || 'lib_members', []);
        
        messages.forEach(msg => {
            let senderName = null;
            if (currentUser.role === 'librarian' || currentUser.role === 'admin') {
                // Show sender name for librarian to distinguish
                if (msg.senderId === currentUser.id || msg.senderId === 'librarian') {
                    senderName = 'You';
                } else {
                    const user = users.find(u => u.id === msg.senderId);
                    const member = members.find(m => m.id === user?.memberId);
                    senderName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email :
                               member ? member.name :
                               msg.senderId;
                }
            }
            this.renderMessage(msg, currentUser.id, senderName);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mark messages as read (mark messages FROM the other user as read)
        if (otherUserId) {
            ChatHelper.markAsRead(otherUserId, currentUser.id);
        }
        this.updateUnreadBadge();
        
        // Refresh conversation list to update unread counts
        if (this.userRole === 'librarian' || this.userRole === 'admin') {
            this.loadConversationList();
        }
    },

    // Render a single message
    renderMessage: function(msg, currentUserId, senderName) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const isSent = msg.senderId === currentUserId || (currentUserId === 'librarian' && msg.senderId === 'librarian');
        console.log('🎨 Chat Render:', {
            messageText: msg.message,
            senderId: msg.senderId,
            currentUserId: currentUserId,
            isSent: isSent,
            className: isSent ? 'sent' : 'received',
            senderName: senderName
        });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let senderLabel = '';
        if (senderName && !isSent) {
            senderLabel = `<div class="chat-message-sender">${this.escapeHtml(senderName)}</div>`;
        }
        
        messageDiv.innerHTML = `
            ${senderLabel}
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

        // Determine receiver based on sender role
        let receiverId, receiverRole;
        if (currentUser.role === 'student') {
            // Student sends to librarian
            receiverId = 'librarian';
            receiverRole = 'librarian';
        } else if (currentUser.role === 'librarian' || currentUser.role === 'admin') {
            // Librarian/Admin sends to selected student
            if (!this.currentReceiver) {
                console.error('❌ Chat: No conversation selected');
                alert('Please select a conversation first');
                return;
            }
            receiverId = this.currentReceiver;
            receiverRole = 'student';
        }

        const result = ChatHelper.sendMessage(
            currentUser.id,
            currentUser.role,
            receiverId,
            receiverRole,
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
        let email = localStorage.getItem('userEmail');
        let role = localStorage.getItem('userRole');
        
        console.log('👤 getCurrentUser: email =', email, ', role =', role);
        
        // Fallback: detect role from page URL if localStorage is missing
        if (!role) {
            const path = window.location.pathname.toLowerCase();
            if (path.includes('faculty.html') || path.includes('librarian')) {
                role = 'librarian';
                console.log('🔧 Fallback: Detected librarian from URL');
            } else if (path.includes('student.html')) {
                role = 'student';
                console.log('🔧 Fallback: Detected student from URL');
            } else if (path.includes('admin.html')) {
                role = 'admin';
                console.log('🔧 Fallback: Detected admin from URL');
            }
        }
        
        if (role === 'student') {
            // For student, we need their member ID from the members list
            const members = LibraryStore.load(LibraryStore.KEYS.members, []);
            console.log('👥 Found members:', members.length);
            
            if (email) {
                const member = members.find(m => m.email === email);
                console.log('🎯 Matched member by email:', member);
                if (member) return { ...member, role: 'student' };
            }
            
            // Fallback: try to find current logged in student
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (isLoggedIn && members.length > 0) {
                // Check if there's a userMemberId
                const memberId = localStorage.getItem('userMemberId');
                if (memberId) {
                    const member = members.find(m => m.id === memberId);
                    console.log('🎯 Matched member by ID:', member);
                    if (member) return { ...member, role: 'student' };
                }
            }
            
            return null;
        } else if (role === 'librarian' || role === 'admin') {
            // For librarian/admin, use a generic ID
            return { id: 'librarian', role: role, name: 'Librarian' };
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
        // Poll every 3 seconds for real-time sync across devices
        this.pollInterval = setInterval(async () => {
            if (!document.hidden) {
                // Fetch latest chat messages from server
                try {
                    const response = await fetch('/api/chat');
                    if (response.ok) {
                        const chatMessages = await response.json();
                        // Update localStorage with server data
                        localStorage.setItem(LibraryStore.KEYS.chat || 'lib_chat', JSON.stringify(chatMessages));
                    }
                } catch (err) {
                    console.log('Chat sync: using local data');
                }
                
                this.updateUnreadBadge();
                if (this.isOpen) {
                    // Refresh conversation list for librarians
                    if (this.userRole === 'librarian' || this.userRole === 'admin') {
                        this.loadConversationList();
                    }
                    this.loadMessages();
                }
            }
        }, 3000); // Reduced from 5 seconds to 3 seconds for faster sync
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

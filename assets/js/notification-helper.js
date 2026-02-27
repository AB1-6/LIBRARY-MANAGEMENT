// Notification & Reminder System
(function() {
    'use strict';

    const NOTIFICATIONS_KEY = 'lib_notifications';
    const NOTIFICATION_PREFS_KEY = 'lib_notification_preferences';

    // Get all notifications
    function getAllNotifications() {
        return LibraryStore.load(NOTIFICATIONS_KEY, []);
    }

    // Save notifications
    function saveNotifications(notifications) {
        LibraryStore.save(NOTIFICATIONS_KEY, notifications);
    }

    // Get notification preferences for a user
    function getNotificationPreferences(userId) {
        const allPrefs = JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) || '{}');
        return allPrefs[userId] || {
            emailEnabled: true,
            smsEnabled: false,
            browserEnabled: true,
            dueDateReminder: true,
            overdueReminder: true,
            newBookAlert: true,
            wishlistAlert: true,
            reminderDaysBefore: 2
        };
    }

    // Save notification preferences
    function saveNotificationPreferences(userId, preferences) {
        const allPrefs = JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) || '{}');
        allPrefs[userId] = preferences;
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(allPrefs));
    }

    // Create a notification
    function createNotification(userId, type, title, message, data = {}) {
        const notifications = getAllNotifications();
        
        const notification = {
            id: 'NOTIF' + Date.now() + Math.random().toString(36).substr(2, 5),
            userId: userId,
            type: type, // 'due_soon', 'overdue', 'returned', 'new_book', 'wishlist_available', 'fine_reminder'
            title: title,
            message: message,
            data: data,
            read: false,
            createdAt: new Date().toISOString()
        };

        notifications.push(notification);
        saveNotifications(notifications);

        // Show browser notification if enabled
        const prefs = getNotificationPreferences(userId);
        if (prefs.browserEnabled) {
            showBrowserNotification(notification);
        }

        return notification;
    }

    // Show browser notification (toast)
    function showBrowserNotification(notification) {
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Create notification element
        const notifEl = document.createElement('div');
        notifEl.className = 'notification-toast notification-' + getNotificationType(notification.type);
        notifEl.innerHTML = `
            <div class="notification-icon">${getNotificationIcon(notification.type)}</div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notifEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notifEl.classList.add('fade-out');
            setTimeout(() => notifEl.remove(), 300);
        }, 5000);
    }

    // Get notification type for styling
    function getNotificationType(type) {
        const typeMap = {
            'due_soon': 'warning',
            'overdue': 'error',
            'returned': 'success',
            'new_book': 'info',
            'wishlist_available': 'success',
            'fine_reminder': 'warning'
        };
        return typeMap[type] || 'info';
    }

    // Get notification icon
    function getNotificationIcon(type) {
        const iconMap = {
            'due_soon': '⏰',
            'overdue': '🚨',
            'returned': '✅',
            'new_book': '📚',
            'wishlist_available': '❤️',
            'fine_reminder': '💰'
        };
        return iconMap[type] || '📢';
    }

    // Get notifications for a user
    function getUserNotifications(userId, limit = 50) {
        const notifications = getAllNotifications();
        return notifications
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    // Get unread count
    function getUnreadCount(userId) {
        const notifications = getAllNotifications();
        return notifications.filter(n => n.userId === userId && !n.read).length;
    }

    // Mark notification as read
    function markAsRead(notificationId) {
        const notifications = getAllNotifications();
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            saveNotifications(notifications);
        }
    }

    // Mark all as read
    function markAllAsRead(userId) {
        const notifications = getAllNotifications();
        notifications.forEach(n => {
            if (n.userId === userId) {
                n.read = true;
            }
        });
        saveNotifications(notifications);
    }

    // Delete notification
    function deleteNotification(notificationId) {
        let notifications = getAllNotifications();
        notifications = notifications.filter(n => n.id !== notificationId);
        saveNotifications(notifications);
    }

    // Clear all notifications for a user
    function clearAllNotifications(userId) {
        let notifications = getAllNotifications();
        notifications = notifications.filter(n => n.userId !== userId);
        saveNotifications(notifications);
    }

    // Check for due date reminders
    function checkDueDateReminders() {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const today = new Date();
        
        issues.forEach(issue => {
            if (issue.status !== 'returned') {
                const member = members.find(m => m.id === issue.memberId);
                if (!member) return;

                const prefs = getNotificationPreferences(issue.memberId);
                if (!prefs.dueDateReminder) return;

                const dueDate = new Date(issue.dueDate);
                const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                // Check if we should send reminder
                if (daysUntilDue === prefs.reminderDaysBefore) {
                    const book = books.find(b => b.id === issue.bookId);
                    const bookTitle = book ? book.title : 'Unknown Book';

                    createNotification(
                        issue.memberId,
                        'due_soon',
                        'Book Due Soon',
                        `"${bookTitle}" is due in ${daysUntilDue} days (${dueDate.toLocaleDateString()})`,
                        { issueId: issue.id, bookId: issue.bookId }
                    );
                }
            }
        });
    }

    // Check for overdue books
    function checkOverdueBooks() {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const today = new Date();
        
        issues.forEach(issue => {
            if (issue.status !== 'returned') {
                const member = members.find(m => m.id === issue.memberId);
                if (!member) return;

                const prefs = getNotificationPreferences(issue.memberId);
                if (!prefs.overdueReminder) return;

                const dueDate = new Date(issue.dueDate);
                const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));

                // Send overdue notification every 7 days
                if (daysOverdue > 0 && daysOverdue % 7 === 0) {
                    const book = books.find(b => b.id === issue.bookId);
                    const bookTitle = book ? book.title : 'Unknown Book';
                    const fine = daysOverdue * 1; // $1 per day

                    createNotification(
                        issue.memberId,
                        'overdue',
                        'Book Overdue!',
                        `"${bookTitle}" is ${daysOverdue} days overdue. Fine: $${fine}. Please return it immediately.`,
                        { issueId: issue.id, bookId: issue.bookId, fine: fine }
                    );
                }
            }
        });
    }

    // Check wishlist availability
    function checkWishlistAvailability() {
        if (!window.WishlistHelper) return;

        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);

        members.forEach(member => {
            const prefs = getNotificationPreferences(member.id);
            if (!prefs.wishlistAlert) return;

            const wishlist = WishlistHelper.getWishlist(member.id);
            
            wishlist.forEach(item => {
                const book = books.find(b => b.id === item.bookId);
                if (book && book.availableCopies > 0) {
                    // Check if we already sent notification for this
                    const existingNotif = getUserNotifications(member.id, 100)
                        .find(n => 
                            n.type === 'wishlist_available' && 
                            n.data.bookId === book.id &&
                            new Date(n.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
                        );

                    if (!existingNotif) {
                        createNotification(
                            member.id,
                            'wishlist_available',
                            'Wishlist Book Available!',
                            `"${book.title}" from your wishlist is now available for borrowing.`,
                            { bookId: book.id, wishlistItemId: item.id }
                        );
                    }
                }
            });
        });
    }

    // Send fine reminders
    function checkFineReminders() {
        if (!window.FineHelper) return;

        const members = LibraryStore.load(LibraryStore.KEYS.members, []);

        members.forEach(member => {
            const fineInfo = FineHelper.getMemberFines(member.id);
            
            if (fineInfo.totalOutstanding > 10) { // Only remind if fine > $10
                const existingNotif = getUserNotifications(member.id, 50)
                    .find(n => 
                        n.type === 'fine_reminder' &&
                        new Date(n.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last 7 days
                    );

                if (!existingNotif) {
                    createNotification(
                        member.id,
                        'fine_reminder',
                        'Outstanding Fines',
                        `You have $${fineInfo.totalOutstanding.toFixed(2)} in outstanding fines. Please pay at the library desk.`,
                        { fine: fineInfo.totalOutstanding }
                    );
                }
            }
        });
    }

    // Run all checks
    function runAllChecks() {
        checkDueDateReminders();
        checkOverdueBooks();
        checkWishlistAvailability();
        checkFineReminders();
    }

    // Start automatic checking (every hour)
    function startAutoCheck() {
        // Run immediately
        runAllChecks();
        
        // Then run every hour
        setInterval(runAllChecks, 60 * 60 * 1000);
    }

    // Render notifications panel
    function renderNotificationsPanel(userId) {
        const notifications = getUserNotifications(userId, 20);
        
        let html = '<div class="notifications-panel">';
        html += '<div class="notifications-header">';
        html += '<h3>Notifications</h3>';
        html += '<button class="btn-text" onclick="NotificationHelper.markAllAsRead(\'' + userId + '\')">Mark all read</button>';
        html += '</div>';
        
        if (notifications.length === 0) {
            html += '<div class="no-notifications">No notifications</div>';
        } else {
            html += '<div class="notifications-list">';
            
            notifications.forEach(notif => {
                const readClass = notif.read ? 'notification-read' : 'notification-unread';
                const typeClass = 'notification-type-' + getNotificationType(notif.type);
                
                html += '<div class="notification-item ' + readClass + ' ' + typeClass + '" onclick="NotificationHelper.markAsRead(\'' + notif.id + '\')">';
                html += '<div class="notification-icon">' + getNotificationIcon(notif.type) + '</div>';
                html += '<div class="notification-body">';
                html += '<div class="notification-title">' + notif.title + '</div>';
                html += '<div class="notification-message">' + notif.message + '</div>';
                html += '<div class="notification-time">' + formatTimeAgo(notif.createdAt) + '</div>';
                html += '</div>';
                html += '<button class="notification-delete" onclick="event.stopPropagation(); NotificationHelper.deleteNotification(\'' + notif.id + '\')">×</button>';
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        html += '</div>';
        
        return html;
    }

    // Format time ago
    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
        return date.toLocaleDateString();
    }

    // Public API
    window.NotificationHelper = {
        createNotification: createNotification,
        getUserNotifications: getUserNotifications,
        getUnreadCount: getUnreadCount,
        markAsRead: markAsRead,
        markAllAsRead: markAllAsRead,
        deleteNotification: deleteNotification,
        clearAllNotifications: clearAllNotifications,
        getNotificationPreferences: getNotificationPreferences,
        saveNotificationPreferences: saveNotificationPreferences,
        checkDueDateReminders: checkDueDateReminders,
        checkOverdueBooks: checkOverdueBooks,
        checkWishlistAvailability: checkWishlistAvailability,
        checkFineReminders: checkFineReminders,
        runAllChecks: runAllChecks,
        startAutoCheck: startAutoCheck,
        renderNotificationsPanel: renderNotificationsPanel
    };

})();

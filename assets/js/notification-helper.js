// Notification & Reminder System
(function() {
    'use strict';

    const NOTIFICATIONS_KEY = 'lib_notifications';
    const NOTIFICATION_PREFS_KEY = 'lib_notification_preferences';
    const FINES_KEY = 'lib_fines';
    let autoCheckStarted = false;

    function getTodayStart() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    }

    function hasRecentNotification(userId, type, matcher, withinMs) {
        const notifications = getAllNotifications();
        const now = Date.now();
        return notifications.some(n => {
            if (n.userId !== userId || n.type !== type) {
                return false;
            }
            const createdAt = new Date(n.createdAt).getTime();
            if (isNaN(createdAt) || now - createdAt > withinMs) {
                return false;
            }
            return typeof matcher === 'function' ? matcher(n) : true;
        });
    }

    function upsertOutstandingFine(issue, amount) {
        if (!issue || !issue.id || amount <= 0) {
            return;
        }

        const fines = LibraryStore.load(FINES_KEY, []);
        let fineRecord = fines.find(f => f.issueId === issue.id && f.status === 'outstanding');
        if (fineRecord) {
            fineRecord.amount = amount;
            fineRecord.updatedDate = new Date().toISOString();
        } else {
            fineRecord = {
                id: 'OF' + Date.now() + Math.random().toString(36).slice(2, 6),
                issueId: issue.id,
                memberId: issue.memberId,
                bookId: issue.bookId,
                amount: amount,
                status: 'outstanding',
                createdDate: new Date().toISOString(),
                updatedDate: new Date().toISOString()
            };
            fines.push(fineRecord);
        }

        LibraryStore.save(FINES_KEY, fines);
    }

    function clearOutstandingFine(issueId) {
        if (!issueId) return;
        const fines = LibraryStore.load(FINES_KEY, []);
        const updated = fines.filter(f => !(f.issueId === issueId && f.status === 'outstanding'));
        if (updated.length !== fines.length) {
            LibraryStore.save(FINES_KEY, updated);
        }
    }

    function checkDueSoonForIssue(issue, today) {
        if (!issue || issue.status === 'returned') {
            return;
        }

        const prefs = getNotificationPreferences(issue.memberId);
        if (!prefs.dueDateReminder) {
            return;
        }

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const dueDate = new Date(issue.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue !== prefs.reminderDaysBefore) {
            return;
        }

        const alreadySent = hasRecentNotification(
            issue.memberId,
            'due_soon',
            n => n.data && n.data.issueId === issue.id,
            24 * 60 * 60 * 1000
        );
        if (alreadySent) {
            return;
        }

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

    function checkOverdueForIssue(issue, today) {
        if (!issue || issue.status === 'returned') {
            return;
        }

        const prefs = getNotificationPreferences(issue.memberId);
        if (!prefs.overdueReminder) {
            return;
        }

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const dueDate = new Date(issue.dueDate);
        const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));

        if (daysOverdue <= 0) {
            return;
        }

        const fine = Math.max(0, daysOverdue * 1);
        upsertOutstandingFine(issue, fine);

        const alreadySent = hasRecentNotification(
            issue.memberId,
            'overdue',
            n => n.data && n.data.issueId === issue.id,
            24 * 60 * 60 * 1000
        );
        if (alreadySent) {
            return;
        }

        const book = books.find(b => b.id === issue.bookId);
        const bookTitle = book ? book.title : 'Unknown Book';

        createNotification(
            issue.memberId,
            'overdue',
            'Book Overdue!',
            `"${bookTitle}" is ${daysOverdue} days overdue. Fine: $${fine}. Please return it immediately.`,
            { issueId: issue.id, bookId: issue.bookId, fine: fine }
        );
    }

    function notifyNextWaitlistMember(bookId) {
        if (!bookId) {
            return { success: false, message: 'Book ID required' };
        }

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const book = books.find(b => b.id === bookId);
        if (!book || Number(book.availableCopies || 0) <= 0) {
            return { success: false, message: 'Book not available' };
        }

        const waitlist = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
        const candidates = waitlist
            .filter(w => w.bookId === bookId && w.status === 'waiting')
            .sort((a, b) => {
                const posDiff = Number(a.position || 9999) - Number(b.position || 9999);
                if (posDiff !== 0) return posDiff;
                return new Date(a.requestDate || 0) - new Date(b.requestDate || 0);
            });

        if (candidates.length === 0) {
            return { success: false, message: 'No waiting members' };
        }

        const next = candidates[0];
        const duplicate = hasRecentNotification(
            next.memberId,
            'wishlist_available',
            n => n.data && n.data.bookId === bookId,
            24 * 60 * 60 * 1000
        );

        if (!duplicate) {
            createNotification(
                next.memberId,
                'wishlist_available',
                'Book Available for You',
                `"${book.title}" is now available. You are next in waitlist. Please request it soon.`,
                { bookId: bookId, waitlistId: next.id }
            );
        }

        next.status = 'notified';
        next.notifiedDate = new Date().toISOString();
        next.notificationExpiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        LibraryStore.save(LibraryStore.KEYS.waitlist, waitlist);

        return { success: true, memberId: next.memberId, waitlistId: next.id };
    }

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
        const today = getTodayStart();
        
        issues.forEach(issue => {
            checkDueSoonForIssue(issue, today);
        });
    }

    // Check for overdue books
    function checkOverdueBooks() {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const today = getTodayStart();
        
        issues.forEach(issue => {
            checkOverdueForIssue(issue, today);
        });
    }

    // Check wishlist availability
    function checkWishlistAvailability() {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);

        books.forEach(book => {
            if (Number(book.availableCopies || 0) > 0) {
                notifyNextWaitlistMember(book.id);
            }
        });
    }

    function processIssueCreated(issue) {
        if (!issue) return;
        const today = getTodayStart();
        checkDueSoonForIssue(issue, today);
        checkOverdueForIssue(issue, today);
    }

    function processIssueReturned(issue) {
        if (!issue) return;

        clearOutstandingFine(issue.id);

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const book = books.find(b => b.id === issue.bookId);
        const title = book ? book.title : 'Book';

        const duplicateReturnNotification = hasRecentNotification(
            issue.memberId,
            'returned',
            n => n.data && n.data.issueId === issue.id,
            24 * 60 * 60 * 1000
        );

        if (!duplicateReturnNotification) {
            createNotification(
                issue.memberId,
                'returned',
                'Return Confirmed',
                `"${title}" return has been recorded successfully.`,
                { issueId: issue.id, bookId: issue.bookId }
            );
        }

        notifyNextWaitlistMember(issue.bookId);
    }

    function processBookAvailability(bookId) {
        notifyNextWaitlistMember(bookId);
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
        if (autoCheckStarted) {
            return;
        }
        autoCheckStarted = true;

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
        processIssueCreated: processIssueCreated,
        processIssueReturned: processIssueReturned,
        processBookAvailability: processBookAvailability,
        notifyNextWaitlistMember: notifyNextWaitlistMember,
        renderNotificationsPanel: renderNotificationsPanel
    };

})();

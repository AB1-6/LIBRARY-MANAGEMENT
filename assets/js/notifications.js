// Notification System for ENTITY Library Management
(function() {
    // Show toast notification
    window.showNotification = function(title, message, type = 'info') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.innerHTML = `
            <div class="notification-toast-icon">${icons[type] || icons.info}</div>
            <div class="notification-toast-content">
                <div class="notification-toast-title">${title}</div>
                <div class="notification-toast-message">${message}</div>
            </div>
            <button class="notification-toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    };

    // Update notification badge on menu item
    window.updateNotificationBadge = function(menuItemSelector, count, color = 'red') {
        const menuItem = document.querySelector(menuItemSelector);
        if (!menuItem) return;

        // Remove existing badge
        const existingBadge = menuItem.querySelector('.notification-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add new badge if count > 0
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = `notification-badge ${color}`;
            badge.textContent = count > 99 ? '99+' : count;
            menuItem.style.position = 'relative';
            menuItem.appendChild(badge);
        }
    };

    // Update request status badge for students
    window.updateStudentRequestBadges = function() {
        if (!window.LibraryStore) return;
        
        const member = getCurrentMember();
        if (!member) return;

        const requests = window.LibraryStore.load(window.LibraryStore.KEYS.requests, []);
        const myRequests = requests.filter(r => r.memberId === member.id);

        const pending = myRequests.filter(r => r.status === 'pending').length;
        const approved = myRequests.filter(r => r.status === 'approved' && !r.notificationRead).length;
        const rejected = myRequests.filter(r => r.status === 'rejected' && !r.notificationRead).length;

        // Update badges
        updateNotificationBadge('[data-section="issue-request"]', pending, 'red');
        
        if (approved > 0) {
            showNotification('Request Approved! 🎉', `Your book request has been approved. Check "My Borrowed Books" to view it.`, 'success');
            // Mark as read
            myRequests.forEach(r => {
                if (r.status === 'approved' && !r.notificationRead) {
                    r.notificationRead = true;
                }
            });
            window.LibraryStore.save(window.LibraryStore.KEYS.requests, requests);
        }

        if (rejected > 0) {
            showNotification('Request Rejected', `Your book request was rejected. Please contact the librarian for details.`, 'warning');
            // Mark as read
            myRequests.forEach(r => {
                if (r.status === 'rejected' && !r.notificationRead) {
                    r.notificationRead = true;
                }
            });
            window.LibraryStore.save(window.LibraryStore.KEYS.requests, requests);
        }
    };

    // Update pending requests badge for librarians
    window.updateLibrarianRequestBadges = function() {
        if (!window.LibraryStore) return;

        const requests = window.LibraryStore.load(window.LibraryStore.KEYS.requests, []);
        const pendingCount = requests.filter(r => r.status === 'pending').length;

        updateNotificationBadge('[data-section="requests"]', pendingCount, 'red');
    };

    // Helper function for students (define here if not already defined)
    function getCurrentMember() {
        if (!window.LibraryStore) return null;
        const memberId = localStorage.getItem('userMemberId');
        const email = localStorage.getItem('userEmail');
        const members = window.LibraryStore.load(window.LibraryStore.KEYS.members, []);
        if (memberId) {
            return members.find((m) => m.id === memberId) || null;
        }
        if (email) {
            return members.find((m) => m.email === email) || null;
        }
        return null;
    }
})();

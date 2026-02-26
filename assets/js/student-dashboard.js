// Student dashboard functionality using localStorage
(function () {
    function getBooks() {
        return LibraryStore.load(LibraryStore.KEYS.books, []);
    }

    function getMembers() {
        return LibraryStore.load(LibraryStore.KEYS.members, []);
    }

    function saveMembers(members) {
        LibraryStore.save(LibraryStore.KEYS.members, members);
    }

    function getIssues() {
        return LibraryStore.load(LibraryStore.KEYS.issues, []);
    }

    function getRequests() {
        return LibraryStore.load(LibraryStore.KEYS.requests, []);
    }

    function saveRequests(requests) {
        LibraryStore.save(LibraryStore.KEYS.requests, requests);
    }

    function getUsers() {
        return LibraryStore.load(LibraryStore.KEYS.users, []);
    }

    function saveUsers(users) {
        LibraryStore.save(LibraryStore.KEYS.users, users);
    }

    function getCurrentMember() {
        const memberId = localStorage.getItem('userMemberId');
        const email = localStorage.getItem('userEmail');
        const members = getMembers();
        if (memberId) {
            return members.find((m) => m.id === memberId) || null;
        }
        if (email) {
            return members.find((m) => m.email === email) || null;
        }
        return null;
    }

    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString();
    }

    function openFormModal(config) {
        if (!window.ModalUI) {
            const modalRoot = document.getElementById('appModal');
            const modalTitle = document.getElementById('appModalTitle');
            const modalBody = document.getElementById('appModalBody');
            const modalSubmit = document.getElementById('appModalSubmit');
            const modalCancel = document.getElementById('appModalCancel');
            const modalClose = document.getElementById('appModalClose');
            const modalBackdrop = document.getElementById('appModalBackdrop');
            if (!modalRoot || !modalTitle || !modalBody || !modalSubmit || !modalCancel || !modalClose) {
                return false;
            }

            const fieldsHtml = config.fields
                .map((field) => {
                    const value = field.value ? String(field.value) : '';
                    const placeholder = field.placeholder ? ' placeholder="' + field.placeholder + '"' : '';
                    const type = field.type || 'text';
                    return (
                        '<div class="form-group">' +
                        '<label for="' + field.id + '">' + field.label + '</label>' +
                        '<input id="' + field.id + '" type="' + type + '" value="' + value + '"' + placeholder + '>' +
                        '</div>'
                    );
                })
                .join('');

            modalTitle.textContent = config.title || 'Dialog';
            modalBody.innerHTML = '<div id="appModalError" class="app-modal-error"></div>' + fieldsHtml;
            modalSubmit.textContent = config.submitLabel || 'Save';
            modalCancel.textContent = 'Cancel';
            modalCancel.style.display = 'inline-flex';

            const closeFallback = function () {
                modalRoot.classList.remove('show');
                modalRoot.setAttribute('aria-hidden', 'true');
                modalBody.innerHTML = '';
            };

            modalSubmit.onclick = function () {
                const values = {};
                let hasError = false;
                config.fields.forEach((field) => {
                    const input = document.getElementById(field.id);
                    const value = input ? input.value.trim() : '';
                    if (field.required && !value) {
                        hasError = true;
                    }
                    values[field.id] = value;
                });
                if (hasError) {
                    const error = document.getElementById('appModalError');
                    if (error) {
                        error.textContent = 'Please fill in all required fields.';
                        error.style.display = 'block';
                    }
                    return;
                }
                const result = config.onSubmit(values);
                if (result !== false) {
                    closeFallback();
                }
            };

            modalCancel.onclick = closeFallback;
            modalClose.onclick = closeFallback;
            if (modalBackdrop) {
                modalBackdrop.onclick = closeFallback;
            }

            modalRoot.classList.add('show');
            modalRoot.setAttribute('aria-hidden', 'false');
            return true;
        }
        const fieldsHtml = config.fields
            .map((field) => {
                const value = field.value ? String(field.value) : '';
                const placeholder = field.placeholder ? ' placeholder="' + field.placeholder + '"' : '';
                const type = field.type || 'text';
                return (
                    '<div class="form-group">' +
                    '<label for="' + field.id + '">' + field.label + '</label>' +
                    '<input id="' + field.id + '" type="' + type + '" value="' + value + '"' + placeholder + '>' +
                    '</div>'
                );
            })
            .join('');

        const bodyHtml = '<div id="appModalError" class="app-modal-error"></div>' + fieldsHtml;
        ModalUI.open({
            title: config.title,
            bodyHtml: bodyHtml,
            submitLabel: config.submitLabel || 'Save',
            cancelLabel: 'Cancel',
            showCancel: true,
            onSubmit: function () {
                const values = {};
                let hasError = false;
                config.fields.forEach((field) => {
                    const input = document.getElementById(field.id);
                    const value = input ? input.value.trim() : '';
                    if (field.required && !value) {
                        hasError = true;
                    }
                    values[field.id] = value;
                });
                if (hasError) {
                    const error = document.getElementById('appModalError');
                    if (error) {
                        error.textContent = 'Please fill in all required fields.';
                        error.style.display = 'block';
                    }
                    return false;
                }
                return config.onSubmit(values);
            }
        });
        return true;
    }

    function showMessage(title, message) {
        if (window.ModalUI) {
            window.ModalUI.openMessage(title, message, 'OK');
            return;
        }
        openFormModal({
            title: title,
            submitLabel: 'OK',
            fields: [],
            onSubmit: function () {}
        });
        const modalBody = document.getElementById('appModalBody');
        if (modalBody) {
            modalBody.innerHTML = '<p>' + message + '</p>';
        }
    }

    function renderBooksTable(filter, category) {
        const tbody = document.getElementById('studentBooksBody');
        if (!tbody) return;
        const books = getBooks().filter((book) => {
            const matchFilter = !filter
                ? true
                : book.title.toLowerCase().includes(filter) ||
                  book.author.toLowerCase().includes(filter) ||
                  book.category.toLowerCase().includes(filter);
            const matchCategory = !category ? true : book.category === category;
            return matchFilter && matchCategory;
        });
        tbody.innerHTML = '';
        books.forEach((book) => {
            const row = document.createElement('tr');
            const availableText = book.availableCopies > 0 ? book.availableCopies + ' available' : 'Out of Stock';
            row.innerHTML =
                '<td>' + book.title + '</td>' +
                '<td>' + book.author + '</td>' +
                '<td>' + book.category + '</td>' +
                '<td>' + availableText + '</td>' +
                '<td>' +
                (book.availableCopies > 0
                    ? '<button class="btn-icon" onclick="requestIssue(\'' + book.id + '\')">Request</button>'
                    : '<button class="btn-icon" disabled>Unavailable</button>') +
                '</td>';
            tbody.appendChild(row);
        });
    }

    function renderRequestsTable() {
        const tbody = document.getElementById('studentRequestsBody');
        if (!tbody) return;
        const member = getCurrentMember();
        const requests = getRequests().filter((req) => member && req.memberId === member.id);
        const books = getBooks();
        tbody.innerHTML = '';
        requests.forEach((req) => {
            const book = books.find((b) => b.id === req.bookId);
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + (book ? book.title : req.bookId) + '</td>' +
                '<td>' + formatDate(req.requestDate) + '</td>' +
                '<td>' + req.status + '</td>' +
                '<td>' +
                (req.status === 'pending'
                    ? '<button class="btn-icon" onclick="cancelRequest(\'' + req.id + '\')">Cancel</button>'
                    : '-') +
                '</td>';
            tbody.appendChild(row);
        });
    }

    function renderBorrowedTable() {
        const tbody = document.getElementById('studentBorrowedBody');
        if (!tbody) return;
        const member = getCurrentMember();
        const issues = getIssues().filter((issue) => member && issue.memberId === member.id && issue.status !== 'returned');
        const books = getBooks();
        tbody.innerHTML = '';
        issues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + (book ? book.author : '-') + '</td>' +
                '<td>' + formatDate(issue.issueDate) + '</td>' +
                '<td>' + formatDate(issue.dueDate) + '</td>' +
                '<td>$0</td>' +
                '<td><button class="btn-icon" onclick="requestReturn(\'' + issue.id + '\')">Request Return</button></td>';
            tbody.appendChild(row);
        });
    }

    function renderHistoryTable() {
        const tbody = document.getElementById('studentHistoryBody');
        if (!tbody) return;
        const member = getCurrentMember();
        const issues = getIssues().filter((issue) => member && issue.memberId === member.id && issue.status === 'returned');
        const books = getBooks();
        tbody.innerHTML = '';
        issues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const issueDate = new Date(issue.issueDate);
            const returnDate = new Date(issue.returnDate);
            const daysKept = returnDate && issueDate ? Math.ceil((returnDate - issueDate) / (1000 * 60 * 60 * 24)) : 0;
            
            // Show actual fine from the issue record or calculate it
            const fine = issue.fine || 0;
            const fineDisplay = fine > 0 ? '$' + fine : '$0';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + formatDate(issue.issueDate) + '</td>' +
                '<td>' + formatDate(issue.returnDate) + '</td>' +
                '<td>' + (daysKept > 0 ? daysKept + ' days' : '-') + '</td>' +
                '<td>' + fineDisplay + '</td>';
            tbody.appendChild(row);
        });
    }

    function updateHistoryStats() {
        const member = getCurrentMember();
        if (!member) return;
        
        const allIssues = getIssues().filter((issue) => issue.memberId === member.id);
        const returnedIssues = allIssues.filter((issue) => issue.status === 'returned');
        
        // Total Books Borrowed (all time)
        const totalBorrowed = allIssues.length;
        const totalBorrowedEl = document.getElementById('historyTotalBorrowed');
        if (totalBorrowedEl) totalBorrowedEl.textContent = totalBorrowed;
        
        // Total Fines Paid (sum of all fines from returned books)
        const totalFines = returnedIssues.reduce((sum, issue) => sum + (issue.fine || 0), 0);
        const totalFinesEl = document.getElementById('historyTotalFines');
        if (totalFinesEl) totalFinesEl.textContent = '$' + totalFines;
        
        // On-Time Returns Percentage
        let onTimeCount = 0;
        returnedIssues.forEach((issue) => {
            if (issue.returnDate && issue.dueDate) {
                const returnDate = new Date(issue.returnDate);
                const dueDate = new Date(issue.dueDate);
                if (returnDate <= dueDate) {
                    onTimeCount++;
                }
            }
        });
        const onTimePercent = returnedIssues.length > 0 
            ? Math.round((onTimeCount / returnedIssues.length) * 100) + '%'
            : '-';
        const onTimeEl = document.getElementById('historyOnTimePercent');
        if (onTimeEl) onTimeEl.textContent = onTimePercent;
        
        // Member Since
        const users = getUsers();
        const userEmail = localStorage.getItem('userEmail');
        const user = users.find(u => u.email === userEmail);
        let memberSince = '-';
        if (user && user.createdDate) {
            const createdDate = new Date(user.createdDate);
            memberSince = createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (user && user.lastLogin) {
            const loginDate = new Date(user.lastLogin);
            memberSince = loginDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        const memberSinceEl = document.getElementById('historyMemberSince');
        if (memberSinceEl) memberSinceEl.textContent = memberSince;
    }

    function updateStats() {
        const member = getCurrentMember();
        const issues = getIssues().filter((issue) => member && issue.memberId === member.id);
        const active = issues.filter((issue) => issue.status !== 'returned');
        const requests = getRequests().filter((req) => member && req.memberId === member.id && req.status === 'pending');

        // Calculate total fines for all active borrowed books ($1/day after due date)
        const today = new Date();
        let totalFines = 0;
        let dueSoonCount = 0;
        
        active.forEach((issue) => {
            const dueDate = new Date(issue.dueDate);
            const daysOverdue = Math.max(0, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)));
            totalFines += daysOverdue * 1;
            
            // Count books due within 2 days
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 2 && daysUntilDue >= 0) {
                dueSoonCount++;
            }
        });

        const borrowed = document.getElementById('statBorrowed');
        const pending = document.getElementById('statPending');
        const dueSoon = document.getElementById('statDueSoon');
        const fines = document.getElementById('statFines');

        if (borrowed) borrowed.textContent = active.length;
        if (pending) pending.textContent = requests.length;
        if (dueSoon) dueSoon.textContent = dueSoonCount;
        if (fines) fines.textContent = '$' + totalFines;
    }

    function fillProfile() {
        const member = getCurrentMember();
        if (!member) return;
        const nameInput = document.getElementById('profileName');
        const idInput = document.getElementById('profileId');
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        if (nameInput) nameInput.value = member.name;
        if (idInput) idInput.value = member.id;
        if (emailInput) emailInput.value = member.email;
        if (phoneInput) phoneInput.value = member.phone;
    }

    function refreshAll() {
        updateStats();
        renderBooksTable();
        renderRequestsTable();
        renderBorrowedTable();
        renderHistoryTable();
        updateHistoryStats();
        fillProfile();
    }

    window.searchBooks = function () {
        const input = document.getElementById('bookSearch');
        const filter = input ? input.value.toLowerCase() : '';
        const categoryFilter = document.getElementById('categoryFilter');
        const category = categoryFilter ? categoryFilter.value : '';
        renderBooksTable(filter, category);
    };

    window.filterByCategory = function () {
        window.searchBooks();
    };

    window.requestIssue = function (bookId) {
        const member = getCurrentMember();
        if (!member) {
            showMessage('Missing Profile', 'Member profile not found.');
            return;
        }
        const requests = getRequests();
        requests.push({
            id: LibraryStore.nextId('R', requests),
            bookId: bookId,
            memberId: member.id,
            reason: '',
            requestDate: new Date().toISOString(), // Store full timestamp
            status: 'pending'
        });
        saveRequests(requests);
        renderRequestsTable();
        showMessage('Submitted', 'Request submitted.');
    };

    window.submitRequest = function () {
        const member = getCurrentMember();
        if (!member) return;
        const bookInput = document.getElementById('requestBookInput');
        const reasonInput = document.getElementById('requestReason');
        const bookValue = bookInput ? bookInput.value.trim() : '';
        if (!bookValue) {
            showMessage('Missing', 'Enter a book id or title.');
            return;
        }
        const book = getBooks().find((b) => b.id === bookValue || b.title.toLowerCase() === bookValue.toLowerCase());
        if (!book) {
            showMessage('Not Found', 'Book not found.');
            return;
        }
        const requests = getRequests();
        requests.push({
            id: LibraryStore.nextId('R', requests),
            bookId: book.id,
            memberId: member.id,
            reason: reasonInput ? reasonInput.value.trim() : '',
            requestDate: new Date().toISOString(), // Store full timestamp
            status: 'pending'
        });
        saveRequests(requests);
        if (bookInput) bookInput.value = '';
        if (reasonInput) reasonInput.value = '';
        renderRequestsTable();
        showMessage('Submitted', 'Request submitted.');
    };

    window.cancelRequest = function (requestId) {
        if (window.ModalUI) {
            window.ModalUI.openConfirm('Cancel Request', 'Cancel this request?', function () {
                const requests = getRequests();
                const req = requests.find((r) => r.id === requestId);
                if (!req) return;
                req.status = 'cancelled';
                saveRequests(requests);
                renderRequestsTable();
            }, 'Cancel Request');
        }
    };

    window.requestReturn = function (issueId) {
        showMessage('Return Request', 'Return request submitted for ' + issueId + '.');
    };

    window.updateProfile = function () {
        const member = getCurrentMember();
        if (!member) return;
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        const members = getMembers();
        const target = members.find((m) => m.id === member.id);
        if (!target) return;
        if (emailInput) target.email = emailInput.value.trim();
        if (phoneInput) target.phone = phoneInput.value.trim();
        saveMembers(members);
        localStorage.setItem('userEmail', target.email);
        showMessage('Updated', 'Profile updated.');
    };

    window.changePassword = function () {
        const currentInput = document.getElementById('currentPassword');
        const newInput = document.getElementById('newPassword');
        const confirmInput = document.getElementById('confirmPassword');
        const currentPassword = currentInput ? currentInput.value : '';
        const newPassword = newInput ? newInput.value : '';
        const confirmPassword = confirmInput ? confirmInput.value : '';
        if (!currentPassword || !newPassword || !confirmPassword) {
            showMessage('Missing', 'Fill all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage('Mismatch', 'Passwords do not match.');
            return;
        }
        const email = localStorage.getItem('userEmail');
        const users = getUsers();
        const user = users.find((u) => u.email === email);
        if (!user || user.password !== currentPassword) {
            showMessage('Invalid', 'Current password is incorrect.');
            return;
        }
        user.password = newPassword;
        saveUsers(users);
        showMessage('Updated', 'Password updated.');
        if (currentInput) currentInput.value = '';
        if (newInput) newInput.value = '';
        if (confirmInput) confirmInput.value = '';
    };

    window.browseBooks = function () {
        const link = document.querySelector('[data-section="books"]');
        if (link) link.click();
    };

    window.requestBook = function () {
        const link = document.querySelector('[data-section="issue-request"]');
        if (link) link.click();
    };

    window.viewMyBooks = function () {
        const link = document.querySelector('[data-section="my-books"]');
        if (link) link.click();
    };

    // Auto-refresh functionality for real-time updates
    let autoRefreshTimer = null;
    
    async function autoRefresh() {
        if (!document.hidden) {
            const indicator = document.getElementById('liveUpdateIndicator');
            const textEl = document.getElementById('lastUpdateText');
            
            // Show updating state
            if (indicator) indicator.classList.add('updating');
            if (textEl) textEl.textContent = 'Updating...';
            
            await LibraryStore.hydrateFromApi();
            refreshAll();
            
            // Show updated state
            if (indicator) indicator.classList.remove('updating');
            if (textEl) {
                const now = new Date();
                textEl.textContent = 'Live - ' + now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            }
        }
    }
    
    function startAutoRefresh() {
        // Refresh every 10 seconds
        autoRefreshTimer = setInterval(autoRefresh, 10000);
        
        // Also refresh when tab becomes visible
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                autoRefresh();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', async function () {
        if (!window.LibraryStore) return;
        
        // Force fresh data load from server to prevent showing cached fake data
        await LibraryStore.hydrateFromApi();
        
        refreshAll();
        
        // Start auto-refresh for real-time updates
        startAutoRefresh();
    });
})();

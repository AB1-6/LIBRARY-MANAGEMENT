// Librarian dashboard functionality using localStorage
(function () {
    function getBooks() {
        return LibraryStore.load(LibraryStore.KEYS.books, []);
    }

    function saveBooks(books) {
        LibraryStore.save(LibraryStore.KEYS.books, books);
    }

    function getMembers() {
        return LibraryStore.load(LibraryStore.KEYS.members, []);
    }

    function getIssues() {
        return LibraryStore.load(LibraryStore.KEYS.issues, []);
    }

    function saveIssues(issues) {
        LibraryStore.save(LibraryStore.KEYS.issues, issues);
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

    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString();
    }

    function daysBetween(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
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

    function updateStats() {
        const issues = getIssues();
        const active = issues.filter((issue) => issue.status !== 'returned');
        const overdue = active.filter((issue) => daysBetween(issue.dueDate) < 0);

        const issuedToday = document.getElementById('statIssuedToday');
        const dueToday = document.getElementById('statDueToday');
        const currentIssued = document.getElementById('statCurrentIssued');
        const currentOverdue = document.getElementById('statOverdue');

        if (issuedToday) issuedToday.textContent = active.length;
        if (dueToday) dueToday.textContent = active.filter((issue) => daysBetween(issue.dueDate) === 0).length;
        if (currentIssued) currentIssued.textContent = active.length;
        if (currentOverdue) currentOverdue.textContent = overdue.length;
    }

    function renderBooksTable(filter) {
        const tbody = document.getElementById('librarianBooksBody');
        if (!tbody) return;
        const books = getBooks().filter((book) => {
            if (!filter) return true;
            const term = filter.toLowerCase();
            return (
                book.title.toLowerCase().includes(term) ||
                book.author.toLowerCase().includes(term) ||
                book.category.toLowerCase().includes(term) ||
                book.id.toLowerCase().includes(term)
            );
        });
        tbody.innerHTML = '';
        books.forEach((book) => {
            const coverImage = book.coverImage || (window.ImageHelper ? ImageHelper.getPlaceholder() : '');
            const coverHtml = coverImage ? '<img src="' + coverImage + '" style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-right: 10px;" alt="' + book.title + '">' : '';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + book.id + '</td>' +
                '<td><div style="display: flex; align-items: center;">' + coverHtml + '<span>' + book.title + '</span></div></td>' +
                '<td>' + book.author + '</td>' +
                '<td>' + book.category + '</td>' +
                '<td>' + book.totalCopies + '</td>' +
                '<td>' + book.availableCopies + '</td>' +
                '<td>' + (book.availableCopies > 0 ? 'Available' : 'Out of Stock') + '</td>';
            tbody.appendChild(row);
        });
    }

    function renderMembersTable(filter) {
        const tbody = document.getElementById('librarianMembersBody');
        if (!tbody) return;
        const members = getMembers().filter((member) => {
            if (!filter) return true;
            const term = filter.toLowerCase();
            return (
                member.name.toLowerCase().includes(term) ||
                member.email.toLowerCase().includes(term) ||
                member.id.toLowerCase().includes(term)
            );
        });
        tbody.innerHTML = '';
        members.forEach((member) => {
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + member.id + '</td>' +
                '<td>' + member.name + '</td>' +
                '<td>' + member.email + '</td>' +
                '<td>' + member.phone + '</td>' +
                '<td>' + member.type + '</td>' +
                '<td>' + countMemberIssues(member.id) + '</td>' +
                '<td><button class="btn-icon" onclick="viewMemberDetails(\'' + member.id + '\')">View</button></td>';
            tbody.appendChild(row);
        });
    }

    function renderIssuesTable() {
        const tbody = document.getElementById('librarianIssuesBody');
        if (!tbody) return;
        const books = getBooks();
        const members = getMembers();
        const issues = getIssues().filter((issue) => issue.status !== 'returned');
        tbody.innerHTML = '';
        issues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const member = members.find((m) => m.id === issue.memberId);
            const daysLeft = daysBetween(issue.dueDate);
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + issue.id + '</td>' +
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                '<td>' + formatDate(issue.issueDate) + '</td>' +
                '<td>' + formatDate(issue.dueDate) + '</td>' +
                '<td>' + (daysLeft < 0 ? Math.abs(daysLeft) + ' days overdue' : daysLeft + ' days') + '</td>' +
                '<td><button class="btn-icon" onclick="acceptReturn(\'' + issue.id + '\')">Return</button></td>';
            tbody.appendChild(row);
        });
    }

    function renderDueTodayTable() {
        const tbody = document.getElementById('librarianDueBody');
        if (!tbody) return;
        const books = getBooks();
        const members = getMembers();
        const issues = getIssues().filter((issue) => issue.status !== 'returned' && daysBetween(issue.dueDate) === 0);
        tbody.innerHTML = '';
        issues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const member = members.find((m) => m.id === issue.memberId);
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + issue.id + '</td>' +
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                '<td>' + (member ? member.email : '-') + '</td>' +
                '<td><button class="btn-icon" onclick="sendReminder(\'' + issue.id + '\')">Remind</button></td>';
            tbody.appendChild(row);
        });
    }

    function renderReports() {
        const issuedBody = document.getElementById('librarianIssuedReport');
        const overdueBody = document.getElementById('librarianOverdueReport');
        if (!issuedBody || !overdueBody) return;
        const books = getBooks();
        const members = getMembers();
        const issues = getIssues();
        issuedBody.innerHTML = '';
        overdueBody.innerHTML = '';

        issues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const member = members.find((m) => m.id === issue.memberId);
            const status = issue.status === 'returned' ? 'Returned' : daysBetween(issue.dueDate) < 0 ? 'Overdue' : 'Active';
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + issue.id + '</td>' +
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                '<td>' + formatDate(issue.issueDate) + '</td>' +
                '<td>' + formatDate(issue.dueDate) + '</td>' +
                '<td>' + status + '</td>';
            issuedBody.appendChild(row);

            if (daysBetween(issue.dueDate) < 0 && issue.status !== 'returned') {
                const overdueRow = document.createElement('tr');
                overdueRow.innerHTML =
                    '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                    '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                    '<td>' + formatDate(issue.dueDate) + '</td>' +
                    '<td>' + Math.abs(daysBetween(issue.dueDate)) + ' days</td>' +
                    '<td><button class="btn-icon" onclick="sendReminder(\'' + issue.id + '\')">Remind</button></td>';
                overdueBody.appendChild(overdueRow);
            }
        });
    }

    function countMemberIssues(memberId) {
        return getIssues().filter((issue) => issue.memberId === memberId && issue.status !== 'returned').length;
    }

    function refreshAll() {
        updateStats();
        renderBooksTable();
        renderMembersTable();
        renderIssuesTable();
        renderRequestsTable();
        renderDueTodayTable();
        renderReports();
        
        // Update notification badges
        if (typeof updateLibrarianRequestBadges === 'function') {
            updateLibrarianRequestBadges();
        }
    }

    window.searchBooks = function () {
        const input = document.getElementById('bookSearch');
        renderBooksTable(input ? input.value : '');
    };

    window.searchMembers = function () {
        const input = document.getElementById('memberSearch');
        renderMembersTable(input ? input.value : '');
    };

    window.viewMemberDetails = function (memberId) {
        const member = getMembers().find((m) => m.id === memberId);
        if (!member) return;
        showMessage('Member Details', 'Name: ' + member.name + '\nEmail: ' + member.email + '\nPhone: ' + member.phone);
    };

    window.showIssueBookForm = function () {
        openFormModal({
            title: 'Issue Book',
            submitLabel: 'Issue',
            fields: [
                { id: 'issueBookId', label: 'Book ID', required: true },
                { id: 'issueMemberId', label: 'Member ID', required: true },
                {
                    id: 'issueDueDate',
                    label: 'Due date (YYYY-MM-DD)',
                    required: true,
                    value: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
                }
            ],
            onSubmit: function (values) {
                const books = getBooks();
                const book = books.find((b) => b.id === values.issueBookId);
                if (!book || book.availableCopies <= 0) {
                    showMessage('Unavailable', 'Book not available.');
                    return false;
                }
                const issues = getIssues();
                issues.push({
                    id: LibraryStore.nextId('I', issues),
                    bookId: values.issueBookId,
                    memberId: values.issueMemberId,
                    issueDate: new Date().toISOString().slice(0, 10),
                    dueDate: values.issueDueDate,
                    returnDate: '',
                    status: 'active'
                });
                book.availableCopies -= 1;
                saveBooks(books);
                saveIssues(issues);
                refreshAll();
            }
        });
    };

    window.showReturnBookForm = function () {
        openFormModal({
            title: 'Accept Return',
            submitLabel: 'Return',
            fields: [{ id: 'returnIssueId', label: 'Issue ID', required: true }],
            onSubmit: function (values) {
                window.acceptReturn(values.returnIssueId);
            }
        });
    };

    window.acceptReturn = function (issueId) {
        const issues = getIssues();
        const issue = issues.find((i) => i.id === issueId);
        if (!issue || issue.status === 'returned') {
            showMessage('Not Found', 'Issue not found.');
            return;
        }
        
        // Calculate fine if overdue ($1/day after due date)
        const returnDate = new Date();
        const dueDate = new Date(issue.dueDate);
        const daysOverdue = Math.max(0, Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)));
        const fine = daysOverdue * 1; // $1 per day
        
        issue.status = 'returned';
        issue.returnDate = returnDate.toISOString();
        issue.fine = fine;
        issue.daysOverdue = daysOverdue;
        
        // Increase available copies when book is returned
        const books = getBooks();
        const book = books.find((b) => b.id === issue.bookId);
        if (book) {
            book.availableCopies += 1;
            saveBooks(books);
        }
        
        saveIssues(issues);
        
        if (fine > 0) {
            showMessage('Book Returned', 'Book returned successfully. Fine: $' + fine + ' (' + daysOverdue + ' days overdue)');
        } else {
            showMessage('Book Returned', 'Book returned successfully. No fine.');
        }
        
        refreshAll();
    };

    window.sendReminder = function (issueId) {
        showMessage('Reminder', 'Reminder sent for issue ' + issueId + '.');
    };

    function renderRequestsTable() {
        const pendingBody = document.getElementById('pendingRequestsBody');
        const historyBody = document.getElementById('requestHistoryBody');
        if (!pendingBody || !historyBody) return;

        const requests = getRequests();
        const books = getBooks();
        const members = getMembers();
        const users = getUsers();

        // Render pending requests
        pendingBody.innerHTML = '';
        const pendingRequests = requests.filter(r => r.status === 'pending');
        
        pendingRequests.forEach((request) => {
            const book = books.find(b => b.id === request.bookId);
            const member = members.find(m => m.id === request.memberId);
            const user = users.find(u => u.memberId === request.memberId);
            
            if (!book || !member) return;

            const row = document.createElement('tr');
            const availableCopies = book.availableCopies || 0;
            const statusColor = availableCopies > 0 ? 'green' : 'red';
            
            // Format date and time for real-time display
            let requestDateTime = '-';
            if (request.requestDate) {
                const dt = new Date(request.requestDate);
                requestDateTime = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
            }
            
            row.innerHTML =
                '<td>' + request.id + '</td>' +
                '<td>' + member.id + '</td>' +
                '<td>' + member.name + '</td>' +
                '<td>' + (user ? user.email : member.email || '-') + '</td>' +
                '<td>' + book.title + '</td>' +
                '<td>' + book.id + '</td>' +
                '<td>' + requestDateTime + '</td>' +
                '<td style="color:' + statusColor + '; font-weight:bold;">' + availableCopies + '</td>' +
                '<td>' +
                (availableCopies > 0 
                    ? '<button class="btn-icon" style="background:#28a745;" onclick="approveRequest(\'' + request.id + '\')">✓ Approve</button>'
                    : '<button class="btn-icon" style="background:#666;" disabled>No Copies</button>') +
                '<button class="btn-icon" style="background:#dc3545; margin-left:5px;" onclick="rejectRequest(\'' + request.id + '\')">✗ Reject</button>' +
                '</td>';
            pendingBody.appendChild(row);
        });

        // Render request history
        historyBody.innerHTML = '';
        const processedRequests = requests.filter(r => r.status !== 'pending').slice(-20);
        
        processedRequests.reverse().forEach((request) => {
            const book = books.find(b => b.id === request.bookId);
            const member = members.find(m => m.id === request.memberId);
            
            const statusBadge = request.status === 'approved' 
                ? '<span class="badge badge-success">Approved</span>'
                : '<span class="badge badge-danger">Rejected</span>';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + request.id + '</td>' +
                '<td>' + (member ? member.name : request.memberId) + '</td>' +
                '<td>' + (book ? book.title : request.bookId) + '</td>' +
                '<td>' + formatDate(request.requestDate) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + (request.processedBy || 'System') + '</td>';
            historyBody.appendChild(row);
        });
    }

    window.approveRequest = function (requestId) {
        const requests = getRequests();
        const request = requests.find(r => r.id === requestId);
        
        if (!request || request.status !== 'pending') {
            showMessage('Error', 'Request not found or already processed.');
            return;
        }

        const books = getBooks();
        const book = books.find(b => b.id === request.bookId);
        
        if (!book) {
            showMessage('Error', 'Book not found.');
            return;
        }

        if (book.availableCopies <= 0) {
            showMessage('Not Available', 'No copies of this book are currently available.');
            return;
        }

        // Create new issue with 7-day validity
        const issues = getIssues();
        const issueId = 'I' + String(issues.length + 1).padStart(3, '0');
        const issueDate = new Date().toISOString();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // 7 days validity
        
        const newIssue = {
            id: issueId,
            bookId: book.id,
            memberId: request.memberId,
            issueDate: issueDate,
            dueDate: dueDate.toISOString(),
            status: 'active',
            fine: 0 // Fine tracking: $1/day after 7 days
        };

        issues.push(newIssue);
        saveIssues(issues);

        // Decrease available copies
        book.availableCopies -= 1;
        saveBooks(books);

        // Update request status
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        request.status = 'approved';
        request.processedBy = currentUser.email || 'Librarian';
        request.processedDate = new Date().toISOString().slice(0, 10);
        saveRequests(requests);

        showMessage('Success', 'Request approved and book issued successfully!');
        refreshAll();
    };

    window.rejectRequest = function (requestId) {
        const requests = getRequests();
        const request = requests.find(r => r.id === requestId);
        
        if (!request || request.status !== 'pending') {
            showMessage('Error', 'Request not found or already processed.');
            return;
        }

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        request.status = 'rejected';
        request.processedBy = currentUser.email || 'Librarian';
        request.processedDate = new Date().toISOString().slice(0, 10);
        saveRequests(requests);

        showMessage('Rejected', 'Request has been rejected.');
        refreshAll();
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
        
        // Initialize chat support for librarian
        if (window.ChatUI) {
            ChatUI.init('librarian');
        }
    });
})();

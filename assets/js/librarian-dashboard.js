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
            // Ensure we always have a cover image (use placeholder if not set)
            let coverImage = (book.coverImage && book.coverImage.trim() !== '') ? book.coverImage : null;
            if (!coverImage && window.ImageHelper) {
                coverImage = ImageHelper.getPlaceholder();
            }
            const coverHtml = coverImage ? '<img src="' + coverImage + '" style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-right: 10px;" alt="' + book.title + '" onerror="this.src=ImageHelper.getPlaceholder()">' : '';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + book.id + '</td>' +
                '<td><div style="display: flex; align-items: center;">' + coverHtml + '<span>' + book.title + '</span></div></td>' +
                '<td>' + book.author + '</td>' +
                '<td>' + book.category + '</td>' +
                '<td>' + book.totalCopies + '</td>' +
                '<td>' + book.availableCopies + '</td>' +
                '<td>' + (book.availableCopies > 0 ? 'Available' : 'Out of Stock') + '</td>' +
                '<td><button class="btn-icon" onclick="fetchSingleBookCover(\'' + book.id + '\')" title="Fetch cover from Google Books">🖼️</button></td>';
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
        updateUserDisplay();
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

    function updateUserDisplay() {
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        const userNameElement = document.getElementById('userName');
        
        if (userNameElement) {
            if (userName) {
                userNameElement.textContent = userName;
            } else if (userEmail) {
                // Fallback to email if no name is set
                const users = getUsers();
                const user = users.find(u => u.email === userEmail);
                if (user && (user.firstName || user.lastName)) {
                    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    userNameElement.textContent = displayName || userEmail;
                } else {
                    userNameElement.textContent = userEmail;
                }
            } else {
                userNameElement.textContent = 'Librarian';
            }
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
        
        // Add to borrowed history for review eligibility
        if (window.ReviewsHelper) {
            ReviewsHelper.addToBorrowedHistory(issue.memberId, issue.bookId, issue.issueDate, issue.returnDate);
        }
        
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

    // ===== NEW FEATURES =====

    // QR Checkout Functions
    window.startQRScanner = function() {
        const container = document.getElementById('qrScannerContainer');
        const video = document.getElementById('qrVideo');
        const canvas = document.getElementById('qrCanvas');
        const status = document.getElementById('qrScanStatus');
        
        if (!window.QRCheckoutHelper) {
            alert('QR Checkout helper not loaded');
            return;
        }

        container.style.display = 'block';
        status.textContent = 'Initializing camera...';

        // Initialize scanner with handleQRScan callback
        QRCheckoutHelper.initScanner('qrVideo', QRCheckoutHelper.handleQRScan);
        
        setTimeout(() => {
            status.textContent = 'Ready! Scan member QR or book barcode';
        }, 1000);
    };

    window.stopQRScanner = function() {
        const container = document.getElementById('qrScannerContainer');
        if (window.QRCheckoutHelper) {
            QRCheckoutHelper.stopScanner();
        }
        container.style.display = 'none';
    };

    window.showManualCheckoutForm = function() {
        if (!window.QRCheckoutHelper) {
            alert('QR Checkout helper not loaded');
            return;
        }

        openFormModal({
            title: 'Manual Checkout',
            fields: [
                { id: 'checkoutMemberId', label: 'Member ID', required: true, placeholder: 'Enter member ID' },
                { id: 'checkoutBookId', label: 'Book ID', required: true, placeholder: 'Enter book ID' }
            ],
            submitLabel: 'Checkout',
            onSubmit: function(values) {
                const result = QRCheckoutHelper.manualCheckout(values.checkoutMemberId, values.checkoutBookId);
                if (result.success) {
                    alert('✓ Book checked out successfully!\nDue date: ' + new Date(result.dueDate).toLocaleDateString());
                    refreshAll();
                } else {
                    alert('✗ Checkout failed: ' + result.message);
                }
            }
        });
    };

    // Fine Management Functions
    window.loadFineManagement = function() {
        if (!window.FineHelper) {
            console.error('FineHelper not loaded');
            return;
        }

        const fineStats = FineHelper.getFineStats();
        const membersWithFines = FineHelper.getMembersWithFines();

        // Update stats
        document.getElementById('statTotalFines').textContent = '$' + fineStats.totalOutstanding.toFixed(2);
        document.getElementById('statMembersWithFines').textContent = membersWithFines.length;
        
        // Populate table
        const tbody = document.getElementById('finesMembersBody');
        if (!tbody) return;

        if (membersWithFines.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No outstanding fines</td></tr>';
            return;
        }

        tbody.innerHTML = membersWithFines.map(item => {
            return '<tr>' +
                '<td>' + item.memberId + '</td>' +
                '<td>' + item.memberName + '</td>' +
                '<td>' + item.memberEmail + '</td>' +
                '<td style="color: #e74c3c; font-weight: bold;">$' + item.totalFine.toFixed(2) + '</td>' +
                '<td>' + item.overdueCount + '</td>' +
                '<td>' +
                '<button class="btn btn-sm btn-primary" onclick="recordFinePayment(\'' + item.memberId + '\')">💳 Record Payment</button> ' +
                '<button class="btn btn-sm btn-secondary" onclick="waiveMemberFine(\'' + item.memberId + '\')">🎁 Waive</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    };

    window.recordFinePayment = function(memberId) {
        if (!window.FineHelper) return;
        
        const fineInfo = FineHelper.getMemberFines(memberId);
        const members = getMembers();
        const member = members.find(m => m.id === memberId);
        
        openFormModal({
            title: 'Record Fine Payment - ' + (member ? member.name : memberId),
            fields: [
                { id: 'fineAmount', label: 'Amount ($)', required: true, type: 'number', value: fineInfo.totalOutstanding.toFixed(2) },
                { id: 'paymentMethod', label: 'Payment Method', required: true, placeholder: 'Cash/Card/Online' },
                { id: 'transactionId', label: 'Transaction ID', placeholder: 'Optional' }
            ],
            submitLabel: 'Record Payment',
            onSubmit: function(values) {
                const amount = parseFloat(values.fineAmount);
                
                // Record payment for all active fines
                fineInfo.activeFines.forEach(fine => {
                    FineHelper.recordPayment(fine.issueId, amount / fineInfo.activeFines.length, values.paymentMethod, values.transactionId);
                });
                
                alert('✓ Payment of $' + amount.toFixed(2) + ' recorded successfully!');
                loadFineManagement();
                refreshAll();
            }
        });
    };

    window.waiveMemberFine = function(memberId) {
        if (!window.FineHelper) return;
        
        const fineInfo = FineHelper.getMemberFines(memberId);
        const members = getMembers();
        const member = members.find(m => m.id === memberId);
        
        openFormModal({
            title: 'Waive Fine - ' + (member ? member.name : memberId),
            fields: [
                { id: 'waiveReason', label: 'Reason for Waiver', required: true, placeholder: 'Enter reason...' }
            ],
            submitLabel: 'Waive Fine',
            onSubmit: function(values) {
                const librarianName = localStorage.getItem('userName') || 'Librarian';
                
                // Waive all active fines
                fineInfo.activeFines.forEach(fine => {
                    FineHelper.waiveFine(fine.issueId, values.waiveReason, librarianName);
                });
                
                alert('✓ Fine of $' + fineInfo.totalOutstanding.toFixed(2) + ' waived successfully!');
                loadFineManagement();
                refreshAll();
            }
        });
    };

    window.exportFineReport = function() {
        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }
        BulkOpsHelper.exportFineReport();
    };

    window.sendFineReminders = function() {
        if (!window.FineHelper || !window.NotificationHelper) {
            alert('Required helpers not loaded');
            return;
        }

        const membersWithFines = FineHelper.getMembersWithFines();
        const memberIds = membersWithFines.filter(m => m.totalFine >= 10).map(m => m.memberId);
        
        if (memberIds.length === 0) {
            alert('No members with fines >= $10');
            return;
        }

        if (confirm('Send fine reminders to ' + memberIds.length + ' members?')) {
            NotificationHelper.checkFineReminders();
            alert('✓ Fine reminders sent to ' + memberIds.length + ' members!');
        }
    };

    // Analytics Functions
    window.loadAnalytics = function() {
        if (!window.AnalyticsHelper) {
            console.error('AnalyticsHelper not loaded');
            return;
        }

        const stats = AnalyticsHelper.getLibraryStats();

        // Update stats cards
        document.getElementById('statAnalyticsTotalBooks').textContent = stats.totalBooks || 0;
        document.getElementById('statUtilization').textContent = (stats.utilizationRate || 0).toFixed(1) + '%';
        document.getElementById('statActiveMembers').textContent = stats.activeMembers ? stats.activeMembers.length : 0;
        
        // Calculate average rating
        const books = getBooks();
        let totalRating = 0;
        let ratedBooks = 0;
        if (window.ReviewsHelper) {
            books.forEach(book => {
                const rating = ReviewsHelper.getBookRating(book.id);
                if (rating.averageRating > 0) {
                    totalRating += rating.averageRating;
                    ratedBooks++;
                }
            });
        }
        const avgRating = ratedBooks > 0 ? (totalRating / ratedBooks).toFixed(1) : '0.0';
        document.getElementById('statAvgRating').textContent = avgRating;

        // Popular books table
        const popularBody = document.getElementById('analyticsPopularBooksBody');
        if (popularBody && stats.popularBooks) {
            popularBody.innerHTML = stats.popularBooks.slice(0, 10).map((book, index) => {
                const rating = window.ReviewsHelper ? ReviewsHelper.getBookRating(book.bookId) : { averageRating: 0 };
                return '<tr>' +
                    '<td>' + (index + 1) + '</td>' +
                    '<td>' + (book.title || 'Unknown') + '</td>' +
                    '<td>' + (book.author || 'Unknown') + '</td>' +
                    '<td>' + book.borrowCount + '</td>' +
                    '<td>' + rating.averageRating.toFixed(1) + ' ⭐</td>' +
                    '</tr>';
            }).join('');
        }

        // Active members table
        const activeBody = document.getElementById('analyticsActiveMembersBody');
        if (activeBody && stats.activeMembers) {
            activeBody.innerHTML = stats.activeMembers.slice(0, 10).map((member, index) => {
                const memberStats = AnalyticsHelper.getMemberStats(member.memberId);
                return '<tr>' +
                    '<td>' + (index + 1) + '</td>' +
                    '<td>' + member.memberName + '</td>' +
                    '<td>' + member.borrowCount + '</td>' +
                    '<td>' + (memberStats.onTimePercentage || 0).toFixed(0) + '%</td>' +
                    '<td>' + (memberStats.currentStreak || 0) + ' months</td>' +
                    '</tr>';
            }).join('');
        }

        // Monthly trends chart
        if (window.ChartHelper && stats.monthlyTrends) {
            const canvas = document.getElementById('monthlyTrendsChart');
            if (canvas) {
                const labels = stats.monthlyTrends.map(t => t.month);
                const data = stats.monthlyTrends.map(t => t.count);
                ChartHelper.renderLineChart('monthlyTrendsChart', {
                    labels: labels,
                    data: data,
                    label: 'Books Borrowed',
                    color: '#3498db',
                    fillArea: true,
                    showPoints: true
                });
            }
        }
    };

    // Bulk Operations Functions
    window.exportBooksCSV = function() {
        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }
        BulkOpsHelper.exportBooks();
    };

    window.exportMembersCSV = function() {
        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }
        BulkOpsHelper.exportMembers();
    };

    window.exportIssuesCSV = function() {
        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }
        BulkOpsHelper.exportIssues('all');
    };

    window.exportOverdueReport = function() {
        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }
        BulkOpsHelper.exportOverdueReport();
    };

    window.exportFineReportCSV = function() {
        exportFineReport();
    };

    window.exportFullLibraryJSON = function() {
        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }
        BulkOpsHelper.exportFullReport();
    };

    window.loadBulkOpsMembers = function() {
        const members = getMembers();
        const issues = getIssues();
        
        // Populate bulk reminder members
        const bulkSelect = document.getElementById('bulkReminderMembers');
        if (bulkSelect) {
            // Get members with overdue books
            const today = new Date();
            const overdueMembers = issues
                .filter(issue => issue.status !== 'returned' && new Date(issue.dueDate) < today)
                .map(issue => {
                    const member = members.find(m => m.id === issue.memberId);
                    return member ? { id: member.id, name: member.name } : null;
                })
                .filter((m, i, a) => m && a.findIndex(t => t.id === m.id) === i);
            
            bulkSelect.innerHTML = overdueMembers.map(m => 
                '<option value="' + m.id + '">' + m.name + ' (' + m.id + ')</option>'
            ).join('');
        }

        // Populate print card members
        const printSelect = document.getElementById('printCardMembers');
        if (printSelect) {
            printSelect.innerHTML = members.map(m => 
                '<option value="' + m.id + '">' + m.name + ' (' + m.id + ')</option>'
            ).join('');
        }
    };

    window.sendBulkReminders = function() {
        const select = document.getElementById('bulkReminderMembers');
        const message = document.getElementById('bulkReminderMessage');
        
        if (!select || !message) return;
        
        const selectedMembers = Array.from(select.selectedOptions).map(o => o.value);
        const messageText = message.value.trim();
        
        if (selectedMembers.length === 0) {
            alert('Please select at least one member');
            return;
        }
        
        if (!messageText) {
            alert('Please enter a message');
            return;
        }

        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }

        const result = BulkOpsHelper.bulkSendReminders(selectedMembers, messageText);
        if (result.success) {
            alert('✓ ' + result.message);
            message.value = '';
        } else {
            alert('✗ ' + result.message);
        }
    };

    window.printMemberCardsBatch = function() {
        const select = document.getElementById('printCardMembers');
        if (!select) return;
        
        const selectedMembers = Array.from(select.selectedOptions).map(o => o.value);
        
        if (selectedMembers.length === 0) {
            alert('Please select at least one member');
            return;
        }

        if (!window.BulkOpsHelper) {
            alert('Bulk operations helper not loaded');
            return;
        }

        BulkOpsHelper.printMemberCards(selectedMembers);
    };

    // Auto-load analytics and fines when sections are opened
    document.addEventListener('DOMContentLoaded', function() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                
                if (section === 'fines') {
                    setTimeout(loadFineManagement, 100);
                } else if (section === 'analytics') {
                    setTimeout(loadAnalytics, 100);
                } else if (section === 'bulk-ops') {
                    setTimeout(loadBulkOpsMembers, 100);
                }
            });
        });
    });

    // Google Books Cover Fetching Functions
    window.fetchAllBookCovers = async function() {
        if (!window.GoogleBooksHelper) {
            alert('Google Books Helper not loaded');
            return;
        }
        
        const books = getBooks();
        const booksWithoutCovers = books.filter(b => !b.coverImage || b.coverImage.trim() === '');
        
        if (booksWithoutCovers.length === 0) {
            alert('All books already have covers!');
            return;
        }
        
        const confirm = window.confirm(
            `This will fetch covers for ${booksWithoutCovers.length} books from Google Books API.\n\n` +
            `This may take a few minutes. Continue?`
        );
        
        if (!confirm) return;
        
        GoogleBooksHelper.showBulkProgress('Fetching Book Covers', 'Initializing...');
        
        const results = await GoogleBooksHelper.fetchAllBookCovers(
            (current, total, title, status) => {
                GoogleBooksHelper.updateProgress(current, total, title, status);
            }
        );
        
        GoogleBooksHelper.showProgressComplete(results);
    };
    
    window.fetchSingleBookCover = async function(bookId) {
        if (!window.GoogleBooksHelper) {
            alert('Google Books Helper not loaded');
            return;
        }
        
        const books = getBooks();
        const book = books.find(b => b.id === bookId);
        
        if (!book) {
            alert('Book not found');
            return;
        }
        
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '⏳';
        button.disabled = true;
        
        const result = await GoogleBooksHelper.refreshBookCover(bookId);
        
        if (result.success && result.coverUrl) {
            alert(`✅ Cover fetched successfully for "${book.title}"!`);
            refreshAll(); // Refresh to show new cover
        } else {
            alert(`❌ Could not fetch cover for "${book.title}".\n\nReason: ${result.error || 'No cover found'}`);
            button.innerHTML = originalText;
            button.disabled = false;
        }
    };

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

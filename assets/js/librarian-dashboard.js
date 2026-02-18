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
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + book.id + '</td>' +
                '<td>' + book.title + '</td>' +
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
        renderDueTodayTable();
        renderReports();
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
        issue.status = 'returned';
        issue.returnDate = new Date().toISOString().slice(0, 10);
        const books = getBooks();
        const book = books.find((b) => b.id === issue.bookId);
        if (book) {
            book.availableCopies += 1;
            saveBooks(books);
        }
        saveIssues(issues);
        refreshAll();
    };

    window.sendReminder = function (issueId) {
        showMessage('Reminder', 'Reminder sent for issue ' + issueId + '.');
    };

    document.addEventListener('DOMContentLoaded', function () {
        if (!window.LibraryStore) return;
        LibraryStore.ensureSeeded();
        refreshAll();
    });
})();

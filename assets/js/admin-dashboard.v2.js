// Admin dashboard functionality using localStorage
(function () {
    function getBooks() {
        return LibraryStore.load(LibraryStore.KEYS.books, []);
    }

    function saveBooks(books) {
        LibraryStore.save(LibraryStore.KEYS.books, books);
    }

    function getCategories() {
        return LibraryStore.load(LibraryStore.KEYS.categories, []);
    }

    function saveCategories(categories) {
        LibraryStore.save(LibraryStore.KEYS.categories, categories);
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

    function saveIssues(issues) {
        LibraryStore.save(LibraryStore.KEYS.issues, issues);
    }

    function getUsers() {
        return LibraryStore.load(LibraryStore.KEYS.users, []);
    }

    function saveUsers(users) {
        LibraryStore.save(LibraryStore.KEYS.users, users);
    }

    function getRequests() {
        return LibraryStore.load(LibraryStore.KEYS.requests, []);
    }

    function formatDate(value) {
        if (!value) {
            return '-';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleDateString();
    }

    function daysBetween(dateStr) {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        return diff;
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
                    const readonly = field.readOnly ? ' readonly' : '';
                    return (
                        '<div class="form-group">' +
                        '<label for="' + field.id + '">' + field.label + '</label>' +
                        '<input id="' + field.id + '" type="' + type + '" value="' + value + '"' + placeholder + readonly + '>' +
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
                const readonly = field.readOnly ? ' readonly' : '';
                return (
                    '<div class="form-group">' +
                    '<label for="' + field.id + '">' + field.label + '</label>' +
                    '<input id="' + field.id + '" type="' + type + '" value="' + value + '"' + placeholder + readonly + '>' +
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

    function confirmAction(title, message, onConfirm) {
        if (window.ModalUI) {
            window.ModalUI.openConfirm(title, message, onConfirm, 'Confirm', 'Cancel');
            return true;
        }
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

        const closeFallback = function () {
            modalRoot.classList.remove('show');
            modalRoot.setAttribute('aria-hidden', 'true');
            modalBody.innerHTML = '';
        };

        modalTitle.textContent = title || 'Confirm';
        modalBody.innerHTML = '<p>' + message + '</p>';
        modalSubmit.textContent = 'Confirm';
        modalCancel.textContent = 'Cancel';
        modalCancel.style.display = 'inline-flex';

        modalSubmit.onclick = function () {
            if (onConfirm) {
                onConfirm();
            }
            closeFallback();
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

    function updateStats() {
        const books = getBooks();
        const members = getMembers();
        const issues = getIssues();
        const activeIssues = issues.filter((issue) => issue.status !== 'returned');
        const overdueIssues = activeIssues.filter((issue) => daysBetween(issue.dueDate) < 0);

        const totalBooks = document.getElementById('statTotalBooks');
        const totalMembers = document.getElementById('statTotalMembers');
        const totalIssued = document.getElementById('statBooksIssued');
        const totalOverdue = document.getElementById('statOverdueBooks');

        if (totalBooks) totalBooks.textContent = books.length;
        if (totalMembers) totalMembers.textContent = members.length;
        if (totalIssued) totalIssued.textContent = activeIssues.length;
        if (totalOverdue) totalOverdue.textContent = overdueIssues.length;
    }

    function renderBooksTable() {
        const tbody = document.getElementById('booksTableBody');
        if (!tbody) {
            return;
        }
        const books = getBooks();
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
                '<td>' +
                '<button class="btn-icon" onclick="editBook(\'' + book.id + '\')">Edit</button>' +
                '<button class="btn-icon" onclick="deleteBook(\'' + book.id + '\')">Delete</button>' +
                '</td>';
            tbody.appendChild(row);
        });
    }

    function renderMembersTable() {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) {
            return;
        }
        const members = getMembers();
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
                '<td>' +
                '<button class="btn-icon" onclick="editMember(\'' + member.id + '\')">Edit</button>' +
                '<button class="btn-icon" onclick="deleteMember(\'' + member.id + '\')">Delete</button>' +
                '</td>';
            tbody.appendChild(row);
        });
    }

    function renderIssuesTables() {
        const activeBody = document.getElementById('issueTableBody');
        const historyBody = document.getElementById('issueHistoryBody');
        if (!activeBody || !historyBody) {
            return;
        }
        const books = getBooks();
        const members = getMembers();
        const issues = getIssues();

        activeBody.innerHTML = '';
        historyBody.innerHTML = '';

        issues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const member = members.find((m) => m.id === issue.memberId);
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + issue.id + '</td>' +
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                '<td>' + formatDate(issue.issueDate) + '</td>' +
                '<td>' + formatDate(issue.dueDate) + '</td>' +
                '<td>' + (issue.status === 'returned' ? 'Returned' : issue.status) + '</td>' +
                '<td>' +
                (issue.status === 'returned'
                    ? '-'
                    : '<button class="btn-icon" onclick="acceptReturn(\'' + issue.id + '\')">Return</button>') +
                '</td>';

            if (issue.status === 'returned') {
                const historyRow = document.createElement('tr');
                historyRow.innerHTML =
                    '<td>' + issue.id + '</td>' +
                    '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                    '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                    '<td>' + formatDate(issue.issueDate) + '</td>' +
                    '<td>' + formatDate(issue.returnDate) + '</td>' +
                    '<td>$0</td>';
                historyBody.appendChild(historyRow);
            } else {
                activeBody.appendChild(row);
            }
        });
    }

    function renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            return;
        }
        const users = getUsers();
        tbody.innerHTML = '';

        users.forEach((user) => {
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + user.id + '</td>' +
                '<td>' + (user.firstName ? user.firstName + ' ' + user.lastName : user.email) + '</td>' +
                '<td>' + user.email + '</td>' +
                '<td>' + user.role + '</td>' +
                '<td>Active</td>' +
                '<td>' +
                '<button class="btn-icon" onclick="resetPassword(\'' + user.id + '\')">Reset</button>' +
                (user.role !== 'admin'
                    ? '<button class="btn-icon" onclick="deleteUser(\'' + user.id + '\')">Delete</button>'
                    : '') +
                '</td>';
            tbody.appendChild(row);
        });
    }

    function renderReports() {
        const overdueBody = document.getElementById('overdueTableBody');
        const finesBody = document.getElementById('finesTableBody');
        if (!overdueBody || !finesBody) {
            return;
        }
        const books = getBooks();
        const members = getMembers();
        const issues = getIssues();
        overdueBody.innerHTML = '';
        finesBody.innerHTML = '';

        // Calculate report statistics
        let totalFines = 0;
        let booksIssuedThisMonth = 0;
        let newMembersThisMonth = 0;
        const categoryCounts = {};
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Count books issued this month
        issues.forEach((issue) => {
            const issueDate = new Date(issue.issueDate);
            if (issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear) {
                booksIssuedThisMonth++;
                
                // Count by category
                const book = books.find((b) => b.id === issue.bookId);
                if (book && book.category) {
                    categoryCounts[book.category] = (categoryCounts[book.category] || 0) + 1;
                }
            }
        });
        
        // Count new members this month
        members.forEach((member) => {
            if (member.createdDate) {
                const createdDate = new Date(member.createdDate);
                if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
                    newMembersThisMonth++;
                }
            }
        });
        
        // Find most borrowed category
        let topCategory = '-';
        let maxCount = 0;
        Object.keys(categoryCounts).forEach((category) => {
            if (categoryCounts[category] > maxCount) {
                maxCount = categoryCounts[category];
                topCategory = category;
            }
        });
        
        // Update stat cards
        const totalFinesEl = document.getElementById('reportTotalFines');
        const booksIssuedEl = document.getElementById('reportBooksIssued');
        const newMembersEl = document.getElementById('reportNewMembers');
        const topCategoryEl = document.getElementById('reportTopCategory');
        
        // Populate overdue books and calculate fines
        issues.forEach((issue) => {
            if (issue.status === 'returned') {
                return;
            }
            const days = daysBetween(issue.dueDate);
            if (days < 0) {
                const fine = Math.abs(days);
                totalFines += fine;
                const book = books.find((b) => b.id === issue.bookId);
                const member = members.find((m) => m.id === issue.memberId);
                const row = document.createElement('tr');
                row.innerHTML =
                    '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                    '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                    '<td>' + formatDate(issue.dueDate) + '</td>' +
                    '<td>' + Math.abs(days) + ' days</td>' +
                    '<td>$' + fine + '.00</td>';
                overdueBody.appendChild(row);
            }
        });

        // Populate fines collected (returned books)
        issues
            .filter((issue) => issue.status === 'returned')
            .forEach((issue) => {
                const book = books.find((b) => b.id === issue.bookId);
                const member = members.find((m) => m.id === issue.memberId);
                const row = document.createElement('tr');
                row.innerHTML =
                    '<td>' + formatDate(issue.returnDate) + '</td>' +
                    '<td>' + (member ? member.name : issue.memberId) + '</td>' +
                    '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                    '<td>0</td>' +
                    '<td>$0.00</td>';
                finesBody.appendChild(row);
            });
        
        // Update stat cards with calculated values
        if (totalFinesEl) totalFinesEl.textContent = '$' + totalFines;
        if (booksIssuedEl) booksIssuedEl.textContent = booksIssuedThisMonth;
        if (newMembersEl) newMembersEl.textContent = newMembersThisMonth;
        if (topCategoryEl) topCategoryEl.textContent = topCategory;
    }

    function countMemberIssues(memberId) {
        return getIssues().filter((issue) => issue.memberId === memberId && issue.status !== 'returned').length;
    }

    function downloadJson(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function refreshAll() {
        updateStats();
        renderBooksTable();
        renderMembersTable();
        renderIssuesTables();
        renderUsersTable();
        renderReports();
    }

    // Expose functions for inline handlers
    window.showAddBookForm = function () {
        openFormModal({
            title: 'Add Book',
            submitLabel: 'Add',
            fields: [
                { id: 'bookTitle', label: 'Book title', required: true },
                { id: 'bookAuthor', label: 'Author name', required: true },
                { id: 'bookCategory', label: 'Category', required: true },
                { id: 'bookCopies', label: 'Total copies', required: true, type: 'number', value: 1 }
            ],
            onSubmit: function (values) {
                const totalCopies = parseInt(values.bookCopies, 10);
                if (isNaN(totalCopies) || totalCopies <= 0) {
                    showMessage('Invalid', 'Total copies must be a positive number.');
                    return false;
                }

                const books = getBooks();
                const categories = getCategories();
                if (!categories.some((c) => c.name.toLowerCase() === values.bookCategory.toLowerCase())) {
                    categories.push({ id: LibraryStore.nextId('C', categories), name: values.bookCategory });
                    saveCategories(categories);
                }

                books.push({
                    id: LibraryStore.nextId('B', books),
                    title: values.bookTitle,
                    author: values.bookAuthor,
                    category: values.bookCategory,
                    totalCopies: totalCopies,
                    availableCopies: totalCopies
                });
                saveBooks(books);
                refreshAll();
            }
        });
    };

    window.showAddCategoryForm = function () {
        openFormModal({
            title: 'Add Category',
            submitLabel: 'Add',
            fields: [{ id: 'categoryName', label: 'Category name', required: true }],
            onSubmit: function (values) {
                const categories = getCategories();
                if (categories.some((c) => c.name.toLowerCase() === values.categoryName.toLowerCase())) {
                    showMessage('Duplicate', 'Category already exists.');
                    return false;
                }
                categories.push({ id: LibraryStore.nextId('C', categories), name: values.categoryName });
                saveCategories(categories);
            }
        });
    };

    window.editBook = function (bookId) {
        const books = getBooks();
        const book = books.find((b) => b.id === bookId);
        if (!book) return;
        openFormModal({
            title: 'Edit Book ' + book.id,
            submitLabel: 'Update',
            fields: [
                { id: 'bookTitle', label: 'Book title', required: true, value: book.title },
                { id: 'bookAuthor', label: 'Author name', required: true, value: book.author },
                { id: 'bookCategory', label: 'Category', required: true, value: book.category },
                { id: 'bookCopies', label: 'Total copies', required: true, type: 'number', value: book.totalCopies }
            ],
            onSubmit: function (values) {
                const totalCopies = parseInt(values.bookCopies, 10);
                if (isNaN(totalCopies) || totalCopies <= 0) {
                    showMessage('Invalid', 'Total copies must be a positive number.');
                    return false;
                }
                const diff = totalCopies - book.totalCopies;
                book.title = values.bookTitle;
                book.author = values.bookAuthor;
                book.category = values.bookCategory;
                book.totalCopies = totalCopies;
                book.availableCopies = Math.max(0, book.availableCopies + diff);
                saveBooks(books);
                refreshAll();
            }
        });
    };

    window.deleteBook = function (bookId) {
        confirmAction('Delete Book', 'Delete this book?', function () {
            let books = getBooks();
            books = books.filter((b) => b.id !== bookId);
            saveBooks(books);
            refreshAll();
        });
    };

    window.showAddMemberForm = function () {
        openFormModal({
            title: 'Add Member',
            submitLabel: 'Add',
            fields: [
                { id: 'memberName', label: 'Member full name', required: true },
                { id: 'memberEmail', label: 'Email', required: true, type: 'email' },
                { id: 'memberPhone', label: 'Phone', required: true },
                { id: 'memberType', label: 'Type (Student/Faculty)', required: true, value: 'Student' }
            ],
            onSubmit: function (values) {
                const members = getMembers();
                members.push({
                    id: LibraryStore.nextId('M', members),
                    name: values.memberName,
                    email: values.memberEmail,
                    phone: values.memberPhone,
                    type: values.memberType
                });
                saveMembers(members);
                refreshAll();
            }
        });
    };

    window.editMember = function (memberId) {
        const members = getMembers();
        const member = members.find((m) => m.id === memberId);
        if (!member) return;
        openFormModal({
            title: 'Edit Member ' + member.id,
            submitLabel: 'Update',
            fields: [
                { id: 'memberName', label: 'Member name', required: true, value: member.name },
                { id: 'memberEmail', label: 'Email', required: true, type: 'email', value: member.email },
                { id: 'memberPhone', label: 'Phone', required: true, value: member.phone },
                { id: 'memberType', label: 'Member type', required: true, value: member.type }
            ],
            onSubmit: function (values) {
                member.name = values.memberName;
                member.email = values.memberEmail;
                member.phone = values.memberPhone;
                member.type = values.memberType;
                saveMembers(members);
                refreshAll();
            }
        });
    };

    window.deleteMember = function (memberId) {
        confirmAction('Delete Member', 'Delete this member?', function () {
            let members = getMembers();
            members = members.filter((m) => m.id !== memberId);
            saveMembers(members);
            refreshAll();
        });
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

    window.showCreateUserForm = function () {
        openFormModal({
            title: 'Create User',
            submitLabel: 'Create',
            fields: [
                { id: 'userEmail', label: 'User email', required: true, type: 'email' },
                { id: 'userPassword', label: 'Password', required: true, type: 'password' },
                { id: 'userRole', label: 'Role (admin/librarian)', required: true, value: 'librarian' },
                { id: 'userFirstName', label: 'First name', required: false },
                { id: 'userLastName', label: 'Last name', required: false }
            ],
            onSubmit: function (values) {
                const role = values.userRole.toLowerCase();
                if (role !== 'admin' && role !== 'librarian') {
                    showMessage('Invalid Role', 'Role must be admin or librarian.');
                    return false;
                }
                const users = getUsers();
                if (users.some((u) => u.email === values.userEmail)) {
                    showMessage('Duplicate', 'Email already exists.');
                    return false;
                }
                users.push({
                    id: LibraryStore.nextId('U', users),
                    email: values.userEmail,
                    password: values.userPassword,
                    role: role,
                    firstName: values.userFirstName,
                    lastName: values.userLastName,
                    createdDate: new Date().toISOString()
                });
                saveUsers(users);
                refreshAll();
            }
        });
    };

    window.resetPassword = function (userId) {
        const users = getUsers();
        const user = users.find((u) => u.id === userId);
        if (!user) return;
        openFormModal({
            title: 'Reset Password',
            submitLabel: 'Reset',
            fields: [{ id: 'resetPassword', label: 'New password', required: true, type: 'password' }],
            onSubmit: function (values) {
                user.password = values.resetPassword;
                saveUsers(users);
                showMessage('Updated', 'Password updated.');
            }
        });
    };

    window.deleteUser = function (userId) {
        confirmAction('Delete User', 'Delete this user?', function () {
            let users = getUsers();
            users = users.filter((u) => u.id !== userId);
            saveUsers(users);
            refreshAll();
        });
    };

    window.exportAllReports = function () {
        downloadJson('library-reports.json', {
            books: getBooks(),
            members: getMembers(),
            issues: getIssues(),
            users: getUsers(),
            requests: getRequests()
        });
        showMessage('Exported', 'Reports exported as JSON.');
    };

    window.backupDatabase = function () {
        confirmAction('Backup Database', 'Create a new database backup?', function () {
            downloadJson('library-backup.json', {
                books: getBooks(),
                categories: getCategories(),
                members: getMembers(),
                issues: getIssues(),
                users: getUsers(),
                requests: getRequests()
            });
            showMessage('Backup Created', 'Backup downloaded as JSON.');
        });
    };

    window.restoreDatabase = function () {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.addEventListener('change', function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    const data = JSON.parse(reader.result);
                    if (data.books) LibraryStore.save(LibraryStore.KEYS.books, data.books);
                    if (data.categories) LibraryStore.save(LibraryStore.KEYS.categories, data.categories);
                    if (data.members) LibraryStore.save(LibraryStore.KEYS.members, data.members);
                    if (data.issues) LibraryStore.save(LibraryStore.KEYS.issues, data.issues);
                    if (data.users) LibraryStore.save(LibraryStore.KEYS.users, data.users);
                    if (data.requests) LibraryStore.save(LibraryStore.KEYS.requests, data.requests);
                    refreshAll();
                    showMessage('Restored', 'Database restored from backup.');
                } catch (err) {
                    showMessage('Error', 'Invalid backup file.');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    };

    window.clearAllData = function () {
        confirmAction('Clear All Data', 
            '⚠️ WARNING: This will delete ALL books, members, categories, issues, and requests!\n\nAdmin and librarian users will be preserved.\n\nAre you absolutely sure?', 
            function () {
                // Clear all data except users
                saveBooks([]);
                saveMembers([]);
                saveCategories([]);
                saveIssues([]);
                LibraryStore.save(LibraryStore.KEYS.requests, []);
                
                // Refresh the dashboard
                refreshAll();
                
                showMessage('Success', 'All data cleared! Books, members, categories, and issues have been deleted. Admin users preserved.');
            }
        );
    };

    window.viewTriggers = function () {
        showMessage('Trigger Details', 'Trigger details are shown in the table below.');
    };

    window.viewTriggerDetails = function (name) {
        showMessage('Trigger', 'Trigger: ' + name + ' (Active)');
    };

    window.downloadBackup = function (fileName) {
        showMessage('Backup', 'Backup file is stored locally: ' + fileName);
    };

    window.restoreFromBackup = function (fileName) {
        showMessage('Restore', 'Use the Restore Database button to upload ' + fileName + '.');
    };

    window.showImportExcelDialog = function () {
        console.log('showImportExcelDialog called');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        input.addEventListener('change', function () {
            console.log('File selected:', input.files[0]);
            const file = input.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    console.log('File read successfully');
                    const text = e.target.result;
                    const rows = parseCSV(text);
                    console.log('Parsed rows:', rows);
                    
                    if (rows.length < 2) {
                        showMessage('Error', 'Excel file must have headers and at least one data row.');
                        return;
                    }
                    
                    const headers = rows[0].map(h => h.toLowerCase().trim());
                    const dataRows = rows.slice(1).filter(row => row.some(cell => cell && cell.trim()));
                    console.log('Headers:', headers);
                    console.log('Data rows:', dataRows.length);
                    
                    if (dataRows.length === 0) {
                        showMessage('Error', 'No data rows found in file.');
                        return;
                    }
                    
                    // Detect data type from headers
                    if (headers.includes('title') && headers.includes('author')) {
                        console.log('Importing as books');
                        importBooks(headers, dataRows);
                    } else if (headers.includes('name') && headers.includes('email')) {
                        console.log('Importing as members');
                        importMembers(headers, dataRows);
                    } else if (headers.includes('category') || headers.includes('category_name') || (headers.includes('name') && headers.length === 1)) {
                        console.log('Importing as categories');
                        importCategories(headers, dataRows);
                    } else {
                        console.log('Unrecognized format. Headers found:', headers);
                        showMessage('Error', 
                            'Unrecognized Excel format. Found columns: ' + headers.join(', ') + 
                            '\n\nFor BOOKS use: title, author, category, copies' +
                            '\nFor MEMBERS use: name, email, phone, type' +
                            '\nFor CATEGORIES use: category (or name or category_name)');
                    }
                } catch (err) {
                    console.error('Import error:', err);
                    showMessage('Error', 'Failed to parse Excel file: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
        input.click();
        console.log('File input created and clicked');
    };

    function parseCSV(text) {
        const lines = text.split(/\r?\n/);
        const result = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const row = line.split(/,|\t/).map(cell => cell.trim().replace(/^"|"$/g, ''));
            result.push(row);
        }
        return result;
    }

    function importBooks(headers, dataRows) {
        const books = getBooks();
        const titleIdx = headers.indexOf('title');
        const authorIdx = headers.indexOf('author');
        const categoryIdx = Math.max(headers.indexOf('category'), headers.indexOf('subject'));
        const copiesIdx = Math.max(headers.indexOf('copies'), headers.indexOf('totalcopies'), headers.indexOf('total'));
        
        let imported = 0;
        dataRows.forEach((row) => {
            const title = row[titleIdx];
            const author = row[authorIdx];
            if (!title || !author) return;
            
            const totalCopies = parseInt(row[copiesIdx]) || 1;
            const newBook = {
                id: LibraryStore.nextId('B', books),
                title: title,
                author: author,
                category: categoryIdx >= 0 ? row[categoryIdx] : 'General',
                totalCopies: totalCopies,
                availableCopies: totalCopies
            };
            books.push(newBook);
            imported++;
        });
        
        saveBooks(books);
        refreshAll();
        showMessage('Success', 'Imported ' + imported + ' books from Excel.');
    }

    function importMembers(headers, dataRows) {
        const members = getMembers();
        const nameIdx = headers.indexOf('name');
        const emailIdx = headers.indexOf('email');
        const phoneIdx = headers.indexOf('phone');
        const typeIdx = Math.max(headers.indexOf('type'), headers.indexOf('membertype'));
        
        let imported = 0;
        dataRows.forEach((row) => {
            const name = row[nameIdx];
            const email = row[emailIdx];
            if (!name || !email) return;
            
            const newMember = {
                id: LibraryStore.nextId('M', members),
                name: name,
                email: email,
                phone: phoneIdx >= 0 ? row[phoneIdx] : '',
                type: typeIdx >= 0 ? row[typeIdx] : 'Student'
            };
            members.push(newMember);
            imported++;
        });
        
        saveMembers(members);
        refreshAll();
        showMessage('Success', 'Imported ' + imported + ' members from Excel.');
    }

    function importCategories(headers, dataRows) {
        const categories = getCategories();
        const nameIdx = Math.max(headers.indexOf('name'), headers.indexOf('category'), headers.indexOf('category_name'));
        
        let imported = 0;
        dataRows.forEach((row) => {
            const name = row[nameIdx];
            if (!name) return;
            
            const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
            if (exists) return;
            
            const newCategory = {
                id: LibraryStore.nextId('C', categories),
                name: name
            };
            categories.push(newCategory);
            imported++;
        });
        
        saveCategories(categories);
        refreshAll();
        showMessage('Success', 'Imported ' + imported + ' categories from Excel.');
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!window.LibraryStore) {
            return;
        }
        LibraryStore.ensureSeeded();
        refreshAll();
    });
})();

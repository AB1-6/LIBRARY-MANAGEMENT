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
                    if (field.type === 'file') {
                        // File input for images
                        const accept = field.accept || 'image/*';
                        const previewHtml = field.existingImage 
                            ? `<div id="${field.id}-preview" style="margin-top: 8px;">
                                <img src="${field. existingImage}" style="max-width: 150px; max-height: 200px; border-radius: 4px; border: 2px solid #ddd;">
                               </div>`
                            : `<div id="${field.id}-preview" style="margin-top: 8px;"></div>`;
                        
                        return (
                            '<div class="form-group">' +
                            '<label for="' + field.id + '">' + field.label + '</label>' +
                            '<input id="' + field.id + '" type="file" accept="' + accept + '" data-is-file="true">' +
                            previewHtml +
                            '</div>'
                        );
                    } else {
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
                    }
                })
                .join('');

            modalTitle.textContent = config.title || 'Dialog';
            modalBody.innerHTML = '<div id="appModalError" class="app-modal-error"></div>' + fieldsHtml;
            modalSubmit.textContent = config.submitLabel || 'Save';
            modalCancel.textContent = 'Cancel';
            modalCancel.style.display = 'inline-flex';

            // Handle file inputs
            const fileData = {};
            config.fields.forEach((field) => {
                if (field.type === 'file') {
                    const fileInput = document.getElementById(field.id);
                    const previewContainer = document.getElementById(field.id + '-preview');
                    
                    if (fileInput && window.ImageHelper) {
                        fileInput.addEventListener('change', function() {
                            ImageHelper.handleFileInput(
                                fileInput,
                                function(base64) {
                                    // Success - store the base64 image
                                    fileData[field.id] = base64;
                                    
                                    // Show preview
                                    if (previewContainer) {
                                        previewContainer.innerHTML = '<img src="' + base64 + '" style="max-width: 150px; max-height: 200px; border-radius: 4px; border: 2px solid #ddd;">';
                                    }
                                },
                                function(error) {
                                    // Error
                                    const errorDiv = document.getElementById('appModalError');
                                    if (errorDiv) {
                                        errorDiv.textContent = error;
                                        errorDiv.style.display = 'block';
                                    }
                                }
                            );
                        });
                    }
                }
            });

            const closeFallback = function () {
                modalRoot.classList.remove('show');
                modalRoot.setAttribute('aria-hidden', 'true');
                modalBody.innerHTML = '';
            };

            modalSubmit.onclick = function () {
                const values = {};
                let hasError = false;
                config.fields.forEach((field) => {
                    if (field.type === 'file') {
                        // Use stored file data
                        values[field.id] = fileData[field.id] || null;
                    } else {
                        const input = document.getElementById(field.id);
                        const value = input ? input.value.trim() : '';
                        if (field.required && !value) {
                            hasError = true;
                        }
                        values[field.id] = value;
                    }
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
                if (field.type === 'file') {
                    // File input for images
                    const accept = field.accept || 'image/*';
                    const previewHtml = field.existingImage 
                        ? `<div id="${field.id}-preview" style="margin-top: 8px;">
                            <img src="${field.existingImage}" style="max-width: 150px; max-height: 200px; border-radius: 4px; border: 2px solid #ddd;">
                           </div>`
                        : `<div id="${field.id}-preview" style="margin-top: 8px;"></div>`;
                    
                    return (
                        '<div class="form-group">' +
                        '<label for="' + field.id + '">' + field.label + '</label>' +
                        '<input id="' + field.id + '" type="file" accept="' + accept + '" data-is-file="true">' +
                        previewHtml +
                        '</div>'
                    );
                } else {
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
                }
            })
            .join('');

        const bodyHtml = '<div id="appModalError" class="app-modal-error"></div>' + fieldsHtml;
        
        // Handle file data
        const fileData = {};
        setTimeout(() => {
            config.fields.forEach((field) => {
                if (field.type === 'file') {
                    const fileInput = document.getElementById(field.id);
                    const previewContainer = document.getElementById(field.id + '-preview');
                    
                    if (fileInput && window.ImageHelper) {
                        fileInput.addEventListener('change', function() {
                            ImageHelper.handleFileInput(
                                fileInput,
                                function(base64) {
                                    fileData[field.id] = base64;
                                    if (previewContainer) {
                                        previewContainer.innerHTML = '<img src="' + base64 + '" style="max-width: 150px; max-height: 200px; border-radius: 4px; border: 2px solid #ddd;">';
                                    }
                                },
                                function(error) {
                                    const errorDiv = document.getElementById('appModalError');
                                    if (errorDiv) {
                                        errorDiv.textContent = error;
                                        errorDiv.style.display = 'block';
                                    }
                                }
                            );
                        });
                    }
                }
            });
        }, 100);
        
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
                    if (field.type === 'file') {
                        values[field.id] = fileData[field.id] || null;
                    } else {
                        const input = document.getElementById(field.id);
                        const value = input ? input.value.trim() : '';
                        if (field.required && !value) {
                            hasError = true;
                        }
                        values[field.id] = value;
                    }
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
        const users = getUsers();
        const issues = getIssues();
        const activeIssues = issues.filter((issue) => issue.status !== 'returned');
        const overdueIssues = activeIssues.filter((issue) => daysBetween(issue.dueDate) < 0);

        const totalBooks = document.getElementById('statTotalBooks');
        const totalUsers = document.getElementById('statTotalUsers');
        const totalMembers = document.getElementById('statTotalMembers');
        const totalIssued = document.getElementById('statBooksIssued');
        const totalOverdue = document.getElementById('statOverdueBooks');

        if (totalBooks) totalBooks.textContent = books.length;
        if (totalUsers) totalUsers.textContent = users.length;
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
            // Ensure we always have a cover image (use placeholder if not set)
            let coverImage = (book.coverImage && book.coverImage.trim() !== '') ? book.coverImage : null;
            if (!coverImage && window.ImageHelper) {
                coverImage = ImageHelper.getPlaceholder();
            }
            const coverHtml = coverImage ? '<img src="' + coverImage + '" style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="' + book.title + '" onerror="this.src=ImageHelper.getPlaceholder()">' : '';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + book.id + '</td>' +
                '<td style="display: flex; align-items: center; gap: 10px;">' + coverHtml + '<span>' + book.title + '</span></td>' +
                '<td>' + book.author + '</td>' +
                '<td>' + book.category + '</td>' +
                '<td>' + book.totalCopies + '</td>' +
                '<td>' + book.availableCopies + '</td>' +
                '<td>' +
                '<button class="btn-icon" onclick="editBook(\'' + book.id + '\')">Edit</button>' +
                '<button class="btn-icon" onclick="deleteBook(\'' + book.id + '\')">Delete</button>' +
                '<button class="btn-icon" onclick="fetchSingleBookCover(\'' + book.id + '\')" title="Fetch cover from Google Books">🖼️</button>' +
                '</td>';
            tbody.appendChild(row);
        });
    }

    function renderLibrariansTable() {
        const tbody = document.getElementById('librariansTableBody');
        if (!tbody) {
            return;
        }
        const users = getUsers();
        const librarians = users.filter(u => u.role === 'librarian');
        tbody.innerHTML = '';

        librarians.forEach((librarian) => {
            const fullName = (librarian.firstName || '') + ' ' + (librarian.lastName || '');
            const createdDate = librarian.createdDate ? new Date(librarian.createdDate).toLocaleDateString() : '-';
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + librarian.id + '</td>' +
                '<td>' + fullName.trim() + '</td>' +
                '<td>' + librarian.email + '</td>' +
                '<td><span class="badge badge-success">Active</span></td>' +
                '<td>' + createdDate + '</td>' +
                '<td>' +
                '<button class="btn-icon" onclick="resetLibrarianPassword(\'' + librarian.id + '\')">🔑 Reset Password</button>' +
                '<button class="btn-icon" onclick="deleteLibrarian(\'' + librarian.id + '\')">🗑️ Delete</button>' +
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
        const members = getMembers();
        tbody.innerHTML = '';

        // Create a map to track which members we've already shown
        const shownMemberIds = new Set();

        // First, show all users (admins, librarians, and students with accounts)
        users.forEach((user) => {
            let displayName = '';
            
            // Build display name
            if (user.firstName || user.lastName) {
                displayName = [user.firstName || '', user.lastName || ''].join(' ').trim();
            }
            
            // Fallback to email if no name
            if (!displayName) {
                displayName = user.email;
            }
            
            let userId = user.id;
            
            // If this is a student, get their name from members table
            if (user.role === 'student' && user.memberId) {
                const member = members.find(m => m.id === user.memberId);
                if (member) {
                    if (member.name && member.name.trim()) {
                        displayName = member.name;
                    }
                    userId = member.id; // Show student ID instead of user ID
                    shownMemberIds.add(member.id);
                }
            }
            
            // Format last login time
            let lastLoginText = 'Never';
            if (user.lastLogin) {
                const loginDate = new Date(user.lastLogin);
                const now = new Date();
                const diffMs = now - loginDate;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);
                
                if (diffMins < 1) {
                    lastLoginText = 'Just now';
                } else if (diffMins < 60) {
                    lastLoginText = diffMins + ' min' + (diffMins !== 1 ? 's' : '') + ' ago';
                } else if (diffHours < 24) {
                    lastLoginText = diffHours + ' hour' + (diffHours !== 1 ? 's' : '') + ' ago';
                } else if (diffDays < 7) {
                    lastLoginText = diffDays + ' day' + (diffDays !== 1 ? 's' : '') + ' ago';
                } else {
                    lastLoginText = loginDate.toLocaleDateString();
                }
            }
            
            const statusBadge = user.lastLogin 
                ? '<span class="badge badge-success">Active</span>' 
                : '<span class="badge badge-warning">Never Logged In</span>';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + userId + '</td>' +
                '<td><strong>' + displayName + '</strong></td>' +
                '<td>' + user.email + '</td>' +
                '<td><span class="badge badge-info">' + user.role.toUpperCase() + '</span></td>' +
                '<td>' + lastLoginText + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' +
                '<button class="btn-icon" onclick="editUser(\'' + user.id + '\')" title="Edit">✏️</button>' +
                '<button class="btn-icon" onclick="resetPassword(\'' + user.id + '\')" title="Reset Password">🔑</button>' +
                (user.role !== 'admin'
                    ? '<button class="btn-icon" style="background:#dc3545;" onclick="deleteUser(\'' + user.id + '\')" title="Delete">🗑️</button>'
                    : '') +
                '</td>';
            tbody.appendChild(row);
        });

        // Then show any members who don't have user accounts yet
        members.forEach((member) => {
            if (!shownMemberIds.has(member.id)) {
                const row = document.createElement('tr');
                row.innerHTML =
                    '<td>' + member.id + '</td>' +
                    '<td><strong>' + (member.name || 'Unknown') + '</strong></td>' +
                    '<td>' + (member.email || '-') + '</td>' +
                    '<td><span class="badge badge-info">STUDENT</span></td>' +
                    '<td>-</td>' +
                    '<td><span class="badge badge-secondary">No Account</span></td>' +
                    '<td>' +
                    '<button class="btn-icon" onclick="editMember(\'' + member.id + '\')" title="Edit">✏️</button>' +
                    '<button class="btn-icon" style="background:#dc3545;" onclick="deleteMember(\'' + member.id + '\')" title="Delete">🗑️</button>' +
                    '</td>';
                tbody.appendChild(row);
            }
        });
    }

    function filterUsersTable() {
        const searchBox = document.getElementById('userSearchBox');
        if (!searchBox) return;
        
        const searchTerm = searchBox.value.toLowerCase().trim();
        const table = document.getElementById('usersDataTable');
        if (!table) return;
        
        const tbody = table.getElementsByTagName('tbody')[0];
        if (!tbody) return;
        
        const rows = tbody.getElementsByTagName('tr');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');
            
            if (cells.length === 0) continue;
            
            // Search in ID, Name, Email columns (indices 0, 1, 2)
            const id = cells[0].textContent || '';
            const name = cells[1].textContent || '';
            const email = cells[2].textContent || '';
            
            const matchFound = 
                id.toLowerCase().includes(searchTerm) ||
                name.toLowerCase().includes(searchTerm) ||
                email.toLowerCase().includes(searchTerm);
            
            row.style.display = matchFound ? '' : 'none';
        }
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
        updateUserDisplay();
        updateStats();
        renderBooksTable();
        renderLibrariansTable();
        renderIssuesTables();
        renderUsersTable();
        renderReports();
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
                userNameElement.textContent = 'Admin';
            }
        }
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
                { id: 'bookCopies', label: 'Total copies', required: true, type: 'number', value: 1 },
                { id: 'bookCover', label: 'Book cover (optional)', type: 'file', accept: 'image/*' }
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

                const newBook = {
                    id: LibraryStore.nextId('B', books),
                    title: values.bookTitle,
                    author: values.bookAuthor,
                    category: values.bookCategory,
                    totalCopies: totalCopies,
                    availableCopies: totalCopies
                };
                
                // Add cover image if provided
                if (values.bookCover) {
                    newBook.coverImage = values.bookCover;
                }
                
                books.push(newBook);
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
                { id: 'bookCopies', label: 'Total copies', required: true, type: 'number', value: book.totalCopies },
                { id: 'bookCover', label: 'Book cover (optional)', type: 'file', accept: 'image/*', existingImage: book.coverImage }
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
                
                // Update cover image if provided
                if (values.bookCover) {
                    book.coverImage = values.bookCover;
                }
                
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

    window.showAddLibrarianForm = function () {
        openFormModal({
            title: 'Create New Librarian',
            submitLabel: 'Create Librarian',
            fields: [
                { id: 'librarianId', label: 'Librarian ID', required: true, placeholder: 'e.g., LIB001' },
                { id: 'librarianFirstName', label: 'First Name', required: true },
                { id: 'librarianLastName', label: 'Last Name', required: true },
                { id: 'librarianEmail', label: 'Email', required: true, type: 'email' },
                { id: 'librarianPassword', label: 'Password', required: true, type: 'password' }
            ],
            onSubmit: function (values) {
                const users = getUsers();
                
                // Check if librarian ID already exists
                if (users.some((u) => u.id === values.librarianId)) {
                    showMessage('Duplicate ID', 'Librarian ID already exists.');
                    return false;
                }
                
                // Check if email already exists
                if (users.some((u) => u.email === values.librarianEmail)) {
                    showMessage('Duplicate Email', 'Email already exists.');
                    return false;
                }
                
                users.push({
                    id: values.librarianId,
                    email: values.librarianEmail,
                    password: values.librarianPassword,
                    role: 'librarian',
                    firstName: values.librarianFirstName,
                    lastName: values.librarianLastName,
                    memberId: '',
                    createdDate: new Date().toISOString()
                });
                
                saveUsers(users);
                refreshAll();
                showMessage('Success', 'Librarian account created successfully!');
            }
        });
    };

    window.resetLibrarianPassword = function (librarianId) {
        const users = getUsers();
        const librarian = users.find((u) => u.id === librarianId);
        if (!librarian) return;
        openFormModal({
            title: 'Reset Librarian Password',
            submitLabel: 'Reset',
            fields: [{ id: 'resetPassword', label: 'New password', required: true, type: 'password' }],
            onSubmit: function (values) {
                librarian.password = values.resetPassword;
                saveUsers(users);
                showMessage('Updated', 'Librarian password updated successfully.');
            }
        });
    };

    window.deleteLibrarian = function (librarianId) {
        confirmAction('Delete Librarian', 'Delete this librarian account? This action cannot be undone.', function () {
            let users = getUsers();
            users = users.filter((u) => u.id !== librarianId);
            saveUsers(users);
            refreshAll();
            showMessage('Deleted', 'Librarian account deleted.');
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

    window.editUser = function (userId) {
        const users = getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) {
            showMessage('Error', 'User not found.');
            return;
        }

        openFormModal({
            title: 'Edit User',
            submitLabel: 'Update',
            fields: [
                { id: 'editFirstName', label: 'First Name', value: user.firstName || '', required: true },
                { id: 'editLastName', label: 'Last Name', value: user.lastName || '', required: true },
                { id: 'editEmail', label: 'Email', value: user.email, required: true, type: 'email' },
                { id: 'editRole', label: 'Role', value: user.role, required: true, type: 'select', options: [
                    { value: 'admin', label: 'Admin' },
                    { value: 'librarian', label: 'Librarian' },
                    { value: 'student', label: 'Student' }
                ]}
            ],
            onSubmit: function (values) {
                // Check if email is already used by another user
                const existingUser = users.find(u => u.email === values.editEmail && u.id !== userId);
                if (existingUser) {
                    showMessage('Error', 'Email is already in use by another user.');
                    return;
                }

                user.firstName = values.editFirstName;
                user.lastName = values.editLastName;
                user.email = values.editEmail;
                user.role = values.editRole;

                saveUsers(users);
                showMessage('Success', 'User updated successfully!');
                refreshAll();
            }
        });
    };

    window.editMember = function (memberId) {
        const members = getMembers();
        const member = members.find(m => m.id === memberId);
        if (!member) {
            showMessage('Error', 'Member not found.');
            return;
        }

        openFormModal({
            title: 'Edit Member',
            submitLabel: 'Update',
            fields: [
                { id: 'editMemberId', label: 'Member ID', value: member.id, required: true, readonly: true },
                { id: 'editMemberName', label: 'Full Name', value: member.name, required: true },
                { id: 'editMemberEmail', label: 'Email', value: member.email || '', type: 'email' },
                { id: 'editMemberPhone', label: 'Phone', value: member.phone || '' }
            ],
            onSubmit: function (values) {
                member.name = values.editMemberName;
                member.email = values.editMemberEmail;
                member.phone = values.editMemberPhone;

                saveMembers(members);
                showMessage('Success', 'Member updated successfully!');
                refreshAll();
            }
        });
    };

    window.deleteMember = function (memberId) {
        confirmAction('Delete Member', 'Delete this member? This will also delete any associated issues.', function () {
            let members = getMembers();
            let issues = getIssues();
            
            // Remove member
            members = members.filter((m) => m.id !== memberId);
            
            // Remove associated issues
            issues = issues.filter((i) => i.memberId !== memberId);
            
            saveMembers(members);
            saveIssues(issues);
            showMessage('Deleted', 'Member and associated data deleted successfully.');
            refreshAll();
        });
    };

    window.deleteUser = function (userId) {
        confirmAction('Delete User', 'Delete this user account?', function () {
            let users = getUsers();
            users = users.filter((u) => u.id !== userId);
            saveUsers(users);
            showMessage('Deleted', 'User account deleted successfully.');
            refreshAll();
        });
    };

    window.filterUsersTable = filterUsersTable;

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

    // Auto-refresh functionality for real-time updates
    let autoRefreshTimer = null;
    
    async function autoRefresh() {
        if (!document.hidden) {
            await LibraryStore.hydrateFromApi();
            refreshAll();
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

    // Google Books Cover Fetching Functions
    window.fetchAllBookCovers = async function(forceRefresh = false) {
        if (!window.GoogleBooksHelper) {
            alert('Google Books Helper not loaded');
            return;
        }
        
        const books = getBooks();
        const booksWithoutCovers = books.filter(b => !b.coverImage || b.coverImage.trim() === '');
        
        if (!forceRefresh && booksWithoutCovers.length === 0) {
            const refreshAll = window.confirm(
                'All books already have covers!\n\n' +
                'Do you want to refresh all covers from Google Books?'
            );
            if (refreshAll) {
                forceRefresh = true;
            } else {
                return;
            }
        }
        
        const targetCount = forceRefresh ? books.length : booksWithoutCovers.length;
        const actionText = forceRefresh ? 'refresh covers for all' : 'fetch covers for';
        
        const confirm = window.confirm(
            `This will ${actionText} ${targetCount} books from Google Books API.\n\n` +
            `This may take a few minutes. Continue?`
        );
        
        if (!confirm) return;
        
        const title = forceRefresh ? 'Refreshing All Book Covers' : 'Fetching Book Covers';
        GoogleBooksHelper.showBulkProgress(title, 'Initializing...');
        
        const results = await GoogleBooksHelper.fetchAllBookCovers(
            (current, total, title, status) => {
                GoogleBooksHelper.updateProgress(current, total, title, status);
            },
            forceRefresh
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
        if (!window.LibraryStore) {
            return;
        }
        
        // Force fresh data load from server to prevent showing cached fake data
        await LibraryStore.hydrateFromApi();
        
        refreshAll();
        
        // Start auto-refresh for real-time updates
        startAutoRefresh();
    });
})();

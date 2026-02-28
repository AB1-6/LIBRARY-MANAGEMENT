// Student dashboard functionality using localStorage
(function () {
    function getBooks() {
        return LibraryStore.load(LibraryStore.KEYS.books, []);
    }

    function getCategories() {
        return LibraryStore.load(LibraryStore.KEYS.categories, []);
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
        const member = getCurrentMember();
        const allBooks = getBooks();
        console.log('📚 Student Dashboard - Loading books:', allBooks.length, 'books');
        const books = allBooks.filter((book) => {
            const matchFilter = !filter
                ? true
                : book.title.toLowerCase().includes(filter) ||
                  book.author.toLowerCase().includes(filter) ||
                  book.category.toLowerCase().includes(filter);
            const matchCategory = !category ? true : book.category === category;
            return matchFilter && matchCategory;
        });
        tbody.innerHTML = '';
        
        // Pre-build lookup maps for better performance
        let wishlistMap = {};
        let waitlistMap = {};
        
        if (member) {
            // Build wishlist lookup
            if (window.WishlistHelper) {
                const wishlists = LibraryStore.load(LibraryStore.KEYS.wishlist, []);
                wishlists.filter(w => w.memberId === member.id).forEach(w => {
                    wishlistMap[w.bookId] = true;
                });
            }
            
            // Build waitlist lookup
            if (window.WishlistHelper) {
                const waitlists = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
                waitlists.filter(w => w.bookId).forEach(w => {
                    if (!waitlistMap[w.bookId]) waitlistMap[w.bookId] = [];
                    waitlistMap[w.bookId].push(w);
                });
            }
        }
        
        // Use DocumentFragment for batch DOM insertion
        const fragment = document.createDocumentFragment();
        
        books.forEach((book) => {
            // Ensure we always have a cover image (use placeholder if not set)
            let coverImage = (book.coverImage && book.coverImage.trim() !== '') ? book.coverImage : null;
            if (!coverImage && window.ImageHelper) {
                coverImage = ImageHelper.getPlaceholder();
            }
            const coverHtml = coverImage ? '<img src="' + coverImage + '" style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-right: 10px;" alt="' + book.title + '" onerror="this.src=ImageHelper.getPlaceholder()">' : '';
            
            // Check wishlist status from pre-built map
            const inWishlist = wishlistMap[book.id] || false;
            const wishlistIcon = inWishlist ? '❤️' : '🤍';
            const wishlistTitle = inWishlist ? 'Remove from wishlist' : 'Add to wishlist';
            
            // Check waitlist status from pre-built map
            let inWaitlist = false;
            let waitlistPosition = null;
            
            if (waitlistMap[book.id] && Array.isArray(waitlistMap[book.id])) {
                const memberWaitlist = waitlistMap[book.id].find(w => w.memberId === member.id);
                if (memberWaitlist) {
                    inWaitlist = true;
                    waitlistPosition = waitlistMap[book.id]
                        .sort((a, b) => new Date(a.joinedDate) - new Date(b.joinedDate))
                        .findIndex(w => w.memberId === member.id) + 1;
                }
            }
            
            const row = document.createElement('tr');
            const availableText = book.availableCopies > 0 ? book.availableCopies + ' available' : 'Out of Stock';
            
            let actionButtons = '';
            if (book.availableCopies > 0) {
                actionButtons = '<button class="btn-icon" onclick="requestIssue(\'' + book.id + '\')">Request</button>';
            } else if (inWaitlist) {
                actionButtons = '<button class="btn-icon" disabled>In Waitlist (#' + waitlistPosition + ')</button> ' +
                               '<button class="btn-icon" onclick="leaveWaitlist(\'' + book.id + '\')">Leave</button>';
            } else {
                actionButtons = '<button class="btn-icon" onclick="joinWaitlist(\'' + book.id + '\')">Join Waitlist</button>';
            }
            
            actionButtons += ' <button class="btn-icon" onclick="toggleWishlist(\'' + book.id + '\')" title="' + wishlistTitle + '">' + wishlistIcon + '</button>';
            
            row.innerHTML =
                '<td><div style="display: flex; align-items: center;">' + coverHtml + '<span>' + book.title + '</span></div></td>' +
                '<td>' + book.author + '</td>' +
                '<td>' + book.category + '</td>' +
                '<td>' + availableText + '</td>' +
                '<td>' + actionButtons + '</td>';
            fragment.appendChild(row);
        });
        
        // Batch insert all rows at once
        tbody.appendChild(fragment);
        console.log('📊 Rendered', books.length, 'books in table view');
        
        // Initialize gallery view
        if (window.BookGallery) {
            console.log('🎨 Initializing BookGallery with', books.length, 'books');
            BookGallery.init('section-books', books);
        } else {
            console.warn('⚠️ BookGallery not loaded');
        }
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
        
        // Personal Information
        const nameInput = document.getElementById('profileName');
        const idInput = document.getElementById('profileId');
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        if (nameInput) nameInput.value = member.name;
        if (idInput) idInput.value = member.id;
        if (emailInput) emailInput.value = member.email;
        if (phoneInput) phoneInput.value = member.phone;
        
        // Account Statistics
        const allIssues = getIssues().filter((issue) => issue.memberId === member.id);
        const activeIssues = allIssues.filter((issue) => issue.status !== 'returned');
        const returnedIssues = allIssues.filter((issue) => issue.status === 'returned');
        
        // Member Since
        const users = getUsers();
        const userEmail = localStorage.getItem('userEmail');
        const user = users.find(u => u.email === userEmail);
        let memberSince = 'Unknown';
        if (user && user.createdDate) {
            const createdDate = new Date(user.createdDate);
            memberSince = createdDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        const memberSinceEl = document.getElementById('profileMemberSince');
        if (memberSinceEl) memberSinceEl.textContent = memberSince;
        
        // Total Books Borrowed
        const totalBorrowedEl = document.getElementById('profileTotalBorrowed');
        if (totalBorrowedEl) totalBorrowedEl.textContent = allIssues.length + ' book' + (allIssues.length !== 1 ? 's' : '');
        
        // Current Books
        const currentBooksEl = document.getElementById('profileCurrentBooks');
        if (currentBooksEl) currentBooksEl.textContent = activeIssues.length + ' book' + (activeIssues.length !== 1 ? 's' : '');
        
        // Total Fines Paid (from returned books)
        const totalFinesPaid = returnedIssues.reduce((sum, issue) => sum + (issue.fine || 0), 0);
        const totalFinesEl = document.getElementById('profileTotalFines');
        if (totalFinesEl) totalFinesEl.textContent = '$' + totalFinesPaid.toFixed(2);
        
        // Outstanding Fines (from active books)
        const today = new Date();
        let outstandingFines = 0;
        activeIssues.forEach((issue) => {
            const dueDate = new Date(issue.dueDate);
            const daysOverdue = Math.max(0, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)));
            outstandingFines += daysOverdue * 1;
        });
        const outstandingFinesEl = document.getElementById('profileOutstandingFines');
        if (outstandingFinesEl) outstandingFinesEl.textContent = '$' + outstandingFines.toFixed(2);
        
        // Generate QR Code (using Google Chart API - no external library needed)
        if (window.QRCodeHelper) {
            QRCodeHelper.generateMemberQR(member, 'qrCodeContainer');
        }

        // Load profile photo
        loadStudentProfile();
    }

    function renderBooksDueSoon() {
        const tbody = document.getElementById('booksDueSoonBody');
        if (!tbody) return;
        
        const member = getCurrentMember();
        const issues = getIssues().filter((issue) => member && issue.memberId === member.id && issue.status !== 'returned');
        const books = getBooks();
        const today = new Date();
        
        tbody.innerHTML = '';
        
        // Filter books due within 2 days
        const dueSoonIssues = issues.filter((issue) => {
            const dueDate = new Date(issue.dueDate);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilDue >= 0 && daysUntilDue <= 2;
        });
        
        if (dueSoonIssues.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" style="text-align: center; color: #999;">No books due soon</td>';
            tbody.appendChild(row);
            return;
        }
        
        dueSoonIssues.forEach((issue) => {
            const book = books.find((b) => b.id === issue.bookId);
            const dueDate = new Date(issue.dueDate);
            const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const daysLeftText = daysLeft === 0 ? 'Due today!' : daysLeft === 1 ? '1 day' : daysLeft + ' days';
            const daysLeftColor = daysLeft === 0 ? 'color: red; font-weight: bold;' : daysLeft === 1 ? 'color: orange; font-weight: bold;' : '';
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + (book ? book.title : issue.bookId) + '</td>' +
                '<td>' + formatDate(issue.issueDate) + '</td>' +
                '<td>' + formatDate(issue.dueDate) + '</td>' +
                '<td style="' + daysLeftColor + '">' + daysLeftText + '</td>';
            tbody.appendChild(row);
        });
    }

    function refreshAll() {
        updateUserDisplay();
        updateStats();
        populateCategoryFilter();
        renderRequestsTable();
        renderBorrowedTable();
        renderHistoryTable();
        updateHistoryStats();
        renderBooksDueSoon();
        fillProfile();
        renderWishlistSection();
        
        // Update notification badges
        if (window.updateStudentRequestBadges) {
            updateStudentRequestBadges();
        }
        
        // Render books with current filters
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else {
            renderBooksTable();
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
                userNameElement.textContent = 'Student';
            }
        }
    }

    window.searchBooks = function () {
        applyFilters();
    };

    // Debounce utility for search
    let searchDebounceTimer;
    window.debouncedSearch = function() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            applyFilters();
        }, 300); // 300ms delay
    };

    window.filterByCategory = function () {
        applyFilters();
    };

    window.applyFilters = function() {
        const searchInput = document.getElementById('bookSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const availabilityFilter = document.getElementById('availabilityFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const category = categoryFilter ? categoryFilter.value : '';
        const availability = availabilityFilter ? availabilityFilter.value : 'all';
        const sortBy = sortFilter ? sortFilter.value : 'title-asc';
        
        const member = getCurrentMember();
        let books = getBooks();
        
        // Apply search filter
        if (searchTerm) {
            books = books.filter(book => 
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.category.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply category filter
        if (category) {
            books = books.filter(book => book.category === category);
        }
        
        // Apply availability filter
        if (availability === 'available') {
            books = books.filter(book => book.availableCopies > 0);
        } else if (availability === 'outofstock') {
            books = books.filter(book => book.availableCopies === 0);
        }
        
        // Apply sorting
        books.sort((a, b) => {
            switch(sortBy) {
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'author-asc':
                    return a.author.localeCompare(b.author);
                case 'author-desc':
                    return b.author.localeCompare(a.author);
                case 'available-desc':
                    return b.availableCopies - a.availableCopies;
                default:
                    return 0;
            }
        });
        
        // Update result count
        const resultCount = document.getElementById('bookResultCount');
        if (resultCount) {
            const totalBooks = getBooks().length;
            resultCount.textContent = `Showing ${books.length} of ${totalBooks} books`;
        }
        
        // Render filtered books
        renderFilteredBooks(books, member);
    };

    function renderFilteredBooks(books, member) {
        const tbody = document.getElementById('studentBooksBody');
        if (!tbody) {
            console.error('❌ studentBooksBody element not found!');
            return;
        }
        
        console.log('✅ Rendering', books.length, 'books');
        tbody.innerHTML = '';
        
        if (books.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center; color: #999;">No books found</td>';
            tbody.appendChild(row);
            return;
        }
        
        // Pre-build lookup maps for better performance
        let wishlistMap = {};
        let waitlistMap = {};
        let ratingMap = {};
        
        if (member) {
            // Build wishlist lookup
            if (window.WishlistHelper && typeof WishlistHelper.isInWishlist === 'function') {
                const wishlists = LibraryStore.load(LibraryStore.KEYS.wishlist, []);
                wishlists.filter(w => w.memberId === member.id).forEach(w => {
                    wishlistMap[w.bookId] = true;
                });
            }
            
            // Build waitlist lookup
            if (window.WishlistHelper && typeof WishlistHelper.isInWaitlist === 'function') {
                const waitlists = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
                waitlists.filter(w => w.bookId).forEach(w => {
                    if (!waitlistMap[w.bookId]) waitlistMap[w.bookId] = [];
                    waitlistMap[w.bookId].push(w);
                });
            }
        }
        
        // Build rating lookup
        if (window.ReviewsHelper) {
            books.forEach(book => {
                ratingMap[book.id] = ReviewsHelper.getBookRating(book.id);
            });
        }
        
        // Use DocumentFragment for batch DOM insertion
        const fragment = document.createDocumentFragment();
        
        books.forEach((book) => {
            try {
                // Ensure we always have a cover image (use placeholder if not set)
                let coverImage = (book.coverImage && book.coverImage.trim() !== '') ? book.coverImage : null;
                if (!coverImage && window.ImageHelper) {
                    coverImage = ImageHelper.getPlaceholder();
                }
                const coverHtml = coverImage ? '<img src="' + coverImage + '" style="width: 40px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-right: 10px;" alt="' + book.title + '" onerror="this.src=ImageHelper.getPlaceholder()">' : '';
                
                // Check wishlist status from pre-built map
                const inWishlist = wishlistMap[book.id] || false;
                const wishlistIcon = inWishlist ? '❤️' : '🤍';
                const wishlistTitle = inWishlist ? 'Remove from wishlist' : 'Add to wishlist';
                
                // Check waitlist status from pre-built map
                let inWaitlist = false;
                let waitlistPosition = null;
                
                if (waitlistMap[book.id] && Array.isArray(waitlistMap[book.id])) {
                    const memberWaitlist = waitlistMap[book.id].find(w => w.memberId === member.id);
                    if (memberWaitlist) {
                        inWaitlist = true;
                        waitlistPosition = waitlistMap[book.id]
                            .sort((a, b) => new Date(a.joinedDate) - new Date(b.joinedDate))
                            .findIndex(w => w.memberId === member.id) + 1;
                    }
                }
                
                const row = document.createElement('tr');
                const availableText = book.availableCopies > 0 ? book.availableCopies + ' available' : 'Out of Stock';
                
                // Get book rating
                let ratingHtml = '';
                if (window.ReviewsHelper) {
                    const rating = ReviewsHelper.getBookRating(book.id);
                    if (rating.count > 0) {
                        ratingHtml = '<div style="display: flex; align-items: center; gap: 5px; margin-top: 5px;">' +
                                    ReviewsHelper.renderStars(parseFloat(rating.average), 'small') +
                                    '<span style="font-size: 12px; color: #666;">(' + rating.count + ')</span>' +
                                    '</div>';
                    }
                }
                
                let actionButtons = '';
                if (book.availableCopies > 0) {
                    actionButtons = '<button class="btn-icon" onclick="requestIssue(\'' + book.id + '\')">Request</button>';
                } else if (inWaitlist) {
                    actionButtons = '<button class="btn-icon" disabled>In Waitlist (#' + waitlistPosition + ')</button> ' +
                                   '<button class="btn-icon" onclick="leaveWaitlist(\'' + book.id + '\')">Leave</button>';
                } else {
                    actionButtons = '<button class="btn-icon" onclick="joinWaitlist(\'' + book.id + '\')">Join Waitlist</button>';
                }
                
                actionButtons += ' <button class="btn-icon" onclick="toggleWishlist(\'' + book.id + '\')" title="' + wishlistTitle + '">' + wishlistIcon + '</button>';
                actionButtons += ' <button class="btn-icon" onclick="viewBookDetails(\'' + book.id + '\')">👁️ Details</button>';
                
                row.innerHTML =
                    '<td><div style="display: flex; align-items: center;">' + coverHtml + '<div><span>' + book.title + '</span>' + ratingHtml + '</div></div></td>' +
                    '<td>' + book.author + '</td>' +
                    '<td>' + book.category + '</td>' +
                    '<td>' + availableText + '</td>' +
                    '<td>' + actionButtons + '</td>';
                fragment.appendChild(row);
            } catch (error) {
                console.error('❌ Error rendering book:', book.title, error);
            }
        });
        
        // Batch insert all rows at once
        tbody.appendChild(fragment);
        
        console.log('✅ Finished rendering', tbody.children.length, 'book rows');
    }

    window.clearFilters = function() {
        // Reset all filters
        const searchInput = document.getElementById('bookSearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const availabilityFilter = document.getElementById('availabilityFilter');
        const sortFilter = document.getElementById('sortFilter');
        
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (availabilityFilter) availabilityFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'title-asc';
        
        applyFilters();
    };

    // Populate category dropdown dynamically
    function populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;
        
        const categories = getCategories();
        const currentValue = categoryFilter.value;
        
        // Clear and rebuild options
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            if (cat.name === currentValue) option.selected = true;
            categoryFilter.appendChild(option);
        });
    }

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

    window.togglePassword = function (inputId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(inputId + '-icon');
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.textContent = '🙈';
        } else {
            input.type = 'password';
            if (icon) icon.textContent = '👁️';
        }
    };

    function loadStudentProfile() {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) return;

        const users = getUsers();
        const currentUser = users.find(u => u.email === userEmail);
        if (!currentUser) return;

        const member = getCurrentMember();

        // Display profile information
        const profileIdDisplay = document.getElementById('profileIdDisplay');
        const profileNameDisplay = document.getElementById('profileNameDisplay');
        const profileEmailDisplay = document.getElementById('profileEmailDisplay');
        const profilePhoneDisplay = document.getElementById('profilePhoneDisplay');

        if (member) {
            if (profileIdDisplay) profileIdDisplay.textContent = member.id || '-';
            if (profileNameDisplay) profileNameDisplay.textContent = member.name || '-';
            if (profileEmailDisplay) profileEmailDisplay.textContent = member.email || '-';
            if (profilePhoneDisplay) profilePhoneDisplay.textContent = member.phone || '-';
        }

        // Display current profile photo if exists
        const currentPhotoContainer = document.getElementById('currentProfilePhoto');
        if (currentPhotoContainer) {
            if (currentUser.profilePhoto) {
                currentPhotoContainer.innerHTML = '<img src="' + currentUser.profilePhoto + '" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;">';
                const removeBtn = document.getElementById('removeProfilePhotoBtn');
                if (removeBtn) removeBtn.style.display = 'inline-flex';
            } else {
                currentPhotoContainer.innerHTML = '<span style="font-size: 80px; color: #999;">👤</span>';
                const removeBtn = document.getElementById('removeProfilePhotoBtn');
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }
    }

    function setupStudentProfilePhotoUpload() {
        const photoInput = document.getElementById('newProfilePhoto');
        const previewContainer = document.getElementById('newPhotoPreview');
        const previewImg = document.getElementById('newPhotoPreviewImg');
        const saveBtn = document.getElementById('saveProfilePhotoBtn');

        if (!photoInput) return;

        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            if (!window.ImageHelper) {
                showMessage('Error', 'Image helper not loaded.');
                return;
            }

            ImageHelper.validateAndRead(file, function(dataUrl) {
                if (previewImg) previewImg.src = dataUrl;
                if (previewContainer) previewContainer.style.display = 'block';
                if (saveBtn) {
                    saveBtn.style.display = 'inline-flex';
                    saveBtn.onclick = function() {
                        const userEmail = localStorage.getItem('userEmail');
                        const users = getUsers();
                        const userIndex = users.findIndex(u => u.email === userEmail);

                        if (userIndex !== -1) {
                            users[userIndex].profilePhoto = dataUrl;
                            saveUsers(users);

                            // Also update member profile if exists
                            const members = getMembers();
                            const memberIndex = members.findIndex(m => m.email === userEmail);
                            if (memberIndex !== -1) {
                                members[memberIndex].profilePhoto = dataUrl;
                                saveMembers(members);
                            }

                            showMessage('Success', 'Profile photo updated successfully!');
                            loadStudentProfile();
                            photoInput.value = '';
                            previewContainer.style.display = 'none';
                            saveBtn.style.display = 'none';
                        }
                    };
                }
            }, function(error) {
                showMessage('Error', error);
            });
        });

        // Remove photo button
        const removeBtn = document.getElementById('removeProfilePhotoBtn');
        if (removeBtn) {
            removeBtn.onclick = function() {
                if (window.ModalUI) {
                    ModalUI.openConfirm('Remove Photo', 'Are you sure you want to remove your profile photo?', function() {
                        const userEmail = localStorage.getItem('userEmail');
                        const users = getUsers();
                        const userIndex = users.findIndex(u => u.email === userEmail);

                        if (userIndex !== -1) {
                            users[userIndex].profilePhoto = '';
                            saveUsers(users);

                            // Also update member profile if exists
                            const members = getMembers();
                            const memberIndex = members.findIndex(m => m.email === userEmail);
                            if (memberIndex !== -1) {
                                members[memberIndex].profilePhoto = '';
                                saveMembers(members);
                            }

                            showMessage('Success', 'Profile photo removed successfully!');
                            loadStudentProfile();
                        }
                    }, 'Remove');
                }
            };
        }
    }

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

    // Wishlist functions
    window.toggleWishlist = function(bookId) {
        const member = getCurrentMember();
        if (!member || !window.WishlistHelper) return;
        
        const inWishlist = WishlistHelper.isInWishlist(member.id, bookId);
        
        if (inWishlist) {
            // Remove from wishlist
            const wishlist = WishlistHelper.getWishlist(member.id);
            const item = wishlist.find(w => w.bookId === bookId);
            if (item) {
                const result = WishlistHelper.removeFromWishlist(item.id);
                if (typeof showNotification === 'function') {
                    showNotification('Removed', result.message, 'info');
                }
            }
        } else {
            // Add to wishlist
            const result = WishlistHelper.addToWishlist(member.id, bookId);
            if (typeof showNotification === 'function') {
                showNotification(result.success ? 'Added' : 'Info', result.message, result.success ? 'success' : 'warning');
            }
        }
        
        // Refresh book display
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else {
            renderBooksTable();
        }
        renderWishlistSection();
    };

    // Waitlist functions
    window.joinWaitlist = function(bookId) {
        const member = getCurrentMember();
        if (!member || !window.WishlistHelper) return;
        
        const result = WishlistHelper.joinWaitlist(member.id, bookId);
        if (typeof showNotification === 'function') {
            showNotification(result.success ? 'Joined Waitlist' : 'Info', result.message, result.success ? 'success' : 'warning');
        }
        
        // Refresh book display
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else {
            renderBooksTable();
        }
        renderWishlistSection();
    };

    window.leaveWaitlist = function(bookId) {
        const member = getCurrentMember();
        if (!member || !window.WishlistHelper) return;
        
        const waitlist = WishlistHelper.getWaitlist(member.id);
        const item = waitlist.find(w => w.bookId === bookId && w.status === 'waiting');
        if (item) {
            const result = WishlistHelper.leaveWaitlist(item.id);
            if (typeof showNotification === 'function') {
                showNotification('Left Waitlist', result.message, 'info');
            }
        }
        
        // Refresh book display
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else {
            renderBooksTable();
        }
        renderWishlistSection();
    };

    // Render wishlist section (for dashboard display)
    function renderWishlistSection() {
        // Can be called to refresh wishlist display
        const member = getCurrentMember();
        if (!member || !window.WishlistHelper) return;
        
        const wishlist = WishlistHelper.getWishlist(member.id);
        const waitlist = WishlistHelper.getWaitlist(member.id).filter(w => w.status === 'waiting');
        
        // Update badges or counters if they exist
        const wishlistBadge = document.getElementById('wishlistBadge');
        if (wishlistBadge) {
            wishlistBadge.textContent = wishlist.length > 0 ? wishlist.length : '';
        }
        
        const waitlistBadge = document.getElementById('waitlistBadge');
        if (waitlistBadge) {
            waitlistBadge.textContent = waitlist.length > 0 ? waitlist.length : '';
        }
    }

    // Auto-refresh functionality for real-time updates
    let autoRefreshTimer = null;
    
    // Book Details Modal with Reviews
    window.viewBookDetails = function(bookId) {
        const book = getBooks().find(b => b.id === bookId);
        if (!book) return;
        
        const member = getCurrentMember();
        
        let detailsHtml = '<div class="book-details-modal">';
        
        // Book Info
        detailsHtml += '<div class="book-details-header">';
        let coverImage = (book.coverImage && book.coverImage.trim() !== '') ? book.coverImage : null;
        if (!coverImage && window.ImageHelper) {
            coverImage = ImageHelper.getPlaceholder();
        }
        if (coverImage) {
            detailsHtml += '<img src="' + coverImage + '" style="width: 150px; height: 225px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;" alt="' + book.title + '" onerror="this.src=ImageHelper.getPlaceholder()">';
        }
        detailsHtml += '<div class="book-details-info">';
        detailsHtml += '<h3>' + book.title + '</h3>';
        detailsHtml += '<p><strong>Author:</strong> ' + book.author + '</p>';
        detailsHtml += '<p><strong>Category:</strong> ' + book.category + '</p>';
        detailsHtml += '<p><strong>Available Copies:</strong> ' + book.availableCopies + ' / ' + book.totalCopies + '</p>';
        if (book.isbn) detailsHtml += '<p><strong>ISBN:</strong> ' + book.isbn + '</p>';
        if (book.publisher) detailsHtml += '<p><strong>Publisher:</strong> ' + book.publisher + '</p>';
        if (book.publishedDate) detailsHtml += '<p><strong>Published:</strong> ' + book.publishedDate + '</p>';
        if (book.description) detailsHtml += '<p style="margin-top: 10px;">' + book.description + '</p>';
        detailsHtml += '</div>';
        detailsHtml += '</div>';
        
        // Reviews Section
        if (window.ReviewsHelper) {
            detailsHtml += '<hr style="margin: 20px 0;">';
            detailsHtml += '<h3>Ratings & Reviews</h3>';
            detailsHtml += ReviewsHelper.renderRatingSummary(bookId);
            
            // Review Form (if eligible)
            if (member) {
                detailsHtml += ReviewsHelper.renderReviewForm(bookId, member.id, member.name);
            }
            
            // Reviews List
            detailsHtml += ReviewsHelper.renderReviewsList(bookId);
        }
        
        detailsHtml += '</div>';
        
        // Show in modal
        const modalBody = document.getElementById('appModalBody');
        const modalTitle = document.getElementById('appModalTitle');
        const modalRoot = document.getElementById('appModal');
        const modalSubmit = document.getElementById('appModalSubmit');
        const modalCancel = document.getElementById('appModalCancel');
        
        if (modalBody && modalTitle && modalRoot) {
            modalTitle.textContent = 'Book Details';
            modalBody.innerHTML = detailsHtml;
            modalSubmit.style.display = 'none';
            modalCancel.textContent = 'Close';
            modalCancel.style.display = 'inline-flex';
            
            modalCancel.onclick = function() {
                modalRoot.classList.remove('show');
                modalRoot.setAttribute('aria-hidden', 'true');
            };
            
            modalRoot.classList.add('show');
            modalRoot.setAttribute('aria-hidden', 'false');
        }
    };
    
    // Rating Input Handling
    window.selectRating = function(rating) {
        const ratingInput = document.getElementById('reviewRating');
        if (ratingInput) {
            ratingInput.value = rating;
        }
        
        // Update visual stars
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('selected');
                star.textContent = '★';
            } else {
                star.classList.remove('selected');
                star.textContent = '☆';
            }
        });
    };
    
    // Submit Book Review
    window.submitBookReview = function(bookId, memberId, memberName) {
        const ratingInput = document.getElementById('reviewRating');
        const reviewText = document.getElementById('reviewText');
        
        if (!ratingInput || !ratingInput.value) {
            showMessage('Missing Rating', 'Please select a rating (1-5 stars)');
            return;
        }
        
        const rating = parseInt(ratingInput.value);
        const text = reviewText ? reviewText.value.trim() : '';
        
        if (window.ReviewsHelper) {
            const result = ReviewsHelper.submitReview(memberId, bookId, rating, text, memberName);
            
            if (result.success) {
                showMessage('Success', result.message);
                // Refresh the book details view
                viewBookDetails(bookId);
            } else {
                showMessage('Error', result.message);
            }
        }
    };
    
    // Mark Review as Helpful
    window.markReviewHelpful = function(reviewId) {
        if (window.ReviewsHelper) {
            const result = ReviewsHelper.markHelpful(reviewId);
            if (result.success) {
                // Update the helpful count in the DOM
                const reviewItem = document.querySelector('[data-review-id="' + reviewId + '"]');
                if (reviewItem) {
                    const helpfulBtn = reviewItem.querySelector('button');
                    if (helpfulBtn) {
                        helpfulBtn.textContent = '👍 Helpful (' + result.helpful + ')';
                    }
                }
            }
        }
    };
    
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
        console.log('🎓 Student Dashboard - Initializing...');
        if (!window.LibraryStore) {
            console.error('❌ LibraryStore not loaded!');
            return;
        }
        
        // Force fresh data load from server to prevent showing cached fake data
        console.log('📡 Loading data from API...');
        await LibraryStore.hydrateFromApi();
        console.log('✅ Data loaded successfully');
        
        refreshAll();
        
        // Start auto-refresh for real-time updates
        startAutoRefresh();
        
        // Initialize profile photo upload
        setupStudentProfilePhotoUpload();
        
        // Initialize chat support
        if (window.ChatUI) {
            ChatUI.init('student');
        }
    });
})();

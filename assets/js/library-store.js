// Shared localStorage helpers for dashboard data
(function () {
    const KEYS = {
        books: 'lib_books',
        categories: 'lib_categories',
        members: 'lib_members',
        issues: 'lib_issues',
        users: 'lib_users',
        requests: 'lib_requests'
    };

    function load(key, fallback) {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }
        try {
            return JSON.parse(raw);
        } catch (err) {
            return fallback;
        }
    }

    function save(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function nextId(prefix, items) {
        let max = 0;
        items.forEach((item) => {
            const id = String(item.id || '');
            if (id.startsWith(prefix)) {
                const num = parseInt(id.slice(prefix.length), 10);
                if (!isNaN(num)) {
                    max = Math.max(max, num);
                }
            }
        });
        const next = String(max + 1).padStart(3, '0');
        return prefix + next;
    }

    function ensureSeeded() {
        const categories = load(KEYS.categories, []);
        if (categories.length === 0) {
            save(KEYS.categories, [
                { id: 'C001', name: 'Computer Science' },
                { id: 'C002', name: 'Programming' },
                { id: 'C003', name: 'Software Engineering' },
                { id: 'C004', name: 'Mathematics' }
            ]);
        }

        const books = load(KEYS.books, []);
        if (books.length === 0) {
            save(KEYS.books, [
                {
                    id: 'B001',
                    title: 'Introduction to Algorithms',
                    author: 'Thomas H. Cormen',
                    category: 'Computer Science',
                    totalCopies: 10,
                    availableCopies: 7
                },
                {
                    id: 'B002',
                    title: 'Clean Code',
                    author: 'Robert C. Martin',
                    category: 'Programming',
                    totalCopies: 8,
                    availableCopies: 5
                },
                {
                    id: 'B003',
                    title: 'Design Patterns',
                    author: 'Gang of Four',
                    category: 'Software Engineering',
                    totalCopies: 6,
                    availableCopies: 4
                }
            ]);
        }

        const members = load(KEYS.members, []);
        if (members.length === 0) {
            save(KEYS.members, [
                {
                    id: 'M001',
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '555-0101',
                    type: 'Student'
                },
                {
                    id: 'M002',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    phone: '555-0102',
                    type: 'Student'
                }
            ]);
        }

        const users = load(KEYS.users, []);
        if (users.length === 0) {
            save(KEYS.users, [
                {
                    id: 'U001',
                    email: 'anlinpunneli@gmail.com',
                    password: 'Anlin20#69',
                    role: 'admin',
                    firstName: 'Admin',
                    lastName: 'User',
                    createdDate: new Date().toISOString()
                },
                {
                    id: 'U002',
                    email: 'librarian@entity.com',
                    password: 'Librarian123!',
                    role: 'librarian',
                    firstName: 'Library',
                    lastName: 'Staff',
                    createdDate: new Date().toISOString()
                }
            ]);
        }

        const issues = load(KEYS.issues, []);
        if (issues.length === 0) {
            save(KEYS.issues, [
                {
                    id: 'I001',
                    bookId: 'B001',
                    memberId: 'M001',
                    issueDate: '2026-02-05',
                    dueDate: '2026-02-19',
                    returnDate: '',
                    status: 'active'
                },
                {
                    id: 'I002',
                    bookId: 'B003',
                    memberId: 'M002',
                    issueDate: '2026-01-30',
                    dueDate: '2026-02-13',
                    returnDate: '',
                    status: 'overdue'
                }
            ]);
        }

        const requests = load(KEYS.requests, []);
        if (requests.length === 0) {
            save(KEYS.requests, [
                {
                    id: 'R001',
                    bookId: 'B002',
                    memberId: 'M001',
                    reason: 'Course assignment',
                    requestDate: '2026-02-18',
                    status: 'pending'
                }
            ]);
        }
    }

    function get(key, fallback) {
        return load(key, fallback);
    }

    function set(key, value) {
        save(key, value);
    }

    window.LibraryStore = {
        KEYS: KEYS,
        load: get,
        save: set,
        nextId: nextId,
        ensureSeeded: ensureSeeded
    };
})();

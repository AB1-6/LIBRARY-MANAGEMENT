// Shared localStorage helpers for dashboard data
(function () {
    const DATA_VERSION = '4.0.0-clean-slate-2026';
    const VERSION_KEY = 'lib_data_version';
    
    // FORCE CLEAR ALL OLD DATA - aggressive cache clearing
    const currentVersion = localStorage.getItem(VERSION_KEY);
    if (currentVersion !== DATA_VERSION) {
        console.log('🧹 CLEARING ALL OLD CACHED DATA...');
        
        // Save login info and chat history
        const keysToKeep = ['isLoggedIn', 'userEmail', 'userRole', 'userName', 'rememberMe', 'userMemberId', 'lib_users', 'userData', 'lib_chat', 'lib_reviews', 'lib_borrowed_books_history'];
        const tempData = {};
        keysToKeep.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) tempData[key] = val;
        });
        
        // Clear everything
        localStorage.clear();
        
        // Restore login info
        Object.keys(tempData).forEach(key => {
            localStorage.setItem(key, tempData[key]);
        });
        
        // Set new version
        localStorage.setItem(VERSION_KEY, DATA_VERSION);
        
        console.log('✓ Cache cleared! All old books, members, issues, and activity removed.');
        console.log('✓ Reloading dashboard data from server...');
        
        // Show visual confirmation
        if (window.location.pathname.includes('dashboard')) {
            alert('✓ Old cached data cleared!\n\nDashboard will now show current data from server.');
        }
    }

    const KEYS = {
        books: 'lib_books',
        categories: 'lib_categories',
        members: 'lib_members',
        issues: 'lib_issues',
        users: 'lib_users',
        requests: 'lib_requests',
        wishlist: 'lib_wishlist',
        waitlist: 'lib_waitlist',
        chat: 'lib_chat',
        reviews: 'lib_reviews',
        borrowedHistory: 'lib_borrowed_books_history'
    };

    const RESOURCE_BY_KEY = {
        lib_books: 'books',
        lib_categories: 'categories',
        lib_members: 'members',
        lib_issues: 'issues',
        lib_users: 'users',
        lib_requests: 'requests',
        lib_wishlist: 'wishlist',
        lib_waitlist: 'waitlist',
        lib_chat: 'chat',
        lib_reviews: 'reviews',
        lib_borrowed_books_history: 'borrowedHistory'
    };

    let initPromise = null;
    let syncTimer = null;
    const pendingResources = new Set();

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
        queueSyncForKey(key);
    }

    async function fetchJson(url, options) {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error('Request failed');
        }
        return response.json();
    }

    function queueSyncForKey(key) {
        const resource = RESOURCE_BY_KEY[key];
        if (!resource) {
            return;
        }
        pendingResources.add(resource);
        if (syncTimer) {
            clearTimeout(syncTimer);
        }
        syncTimer = setTimeout(function () {
            const resources = Array.from(pendingResources);
            pendingResources.clear();
            syncTimer = null;
            resources.forEach(function (name) {
                syncResource(name);
            });
        }, 250);
    }

    async function syncResource(resource) {
        const key = KEYS[resource];
        if (!key) {
            return;
        }

        try {
            const items = load(key, []);
            await fetchJson('/api/' + resource, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: items })
            });
        } catch (err) {
            // Keep local data if API is unavailable.
        }
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
                }
            ]);
        }

        if (!initPromise) {
            initPromise = hydrateFromApi();
        }
    }

    async function hydrateFromApi() {
        try {
            const snapshot = await fetchJson('/api/init');
            if (snapshot.books) localStorage.setItem(KEYS.books, JSON.stringify(snapshot.books));
            if (snapshot.categories) localStorage.setItem(KEYS.categories, JSON.stringify(snapshot.categories));
            if (snapshot.members) localStorage.setItem(KEYS.members, JSON.stringify(snapshot.members));
            if (snapshot.issues) localStorage.setItem(KEYS.issues, JSON.stringify(snapshot.issues));
            if (snapshot.users) localStorage.setItem(KEYS.users, JSON.stringify(snapshot.users));
            if (snapshot.requests) localStorage.setItem(KEYS.requests, JSON.stringify(snapshot.requests));
            // Initialize new storage with empty arrays if not in snapshot
            if (snapshot.wishlist) {
                localStorage.setItem(KEYS.wishlist, JSON.stringify(snapshot.wishlist));
            } else if (!localStorage.getItem(KEYS.wishlist)) {
                localStorage.setItem(KEYS.wishlist, '[]');
            }
            if (snapshot.waitlist) {
                localStorage.setItem(KEYS.waitlist, JSON.stringify(snapshot.waitlist));
            } else if (!localStorage.getItem(KEYS.waitlist)) {
                localStorage.setItem(KEYS.waitlist, '[]');
            }
            if (snapshot.chat) {
                localStorage.setItem(KEYS.chat, JSON.stringify(snapshot.chat));
            } else if (!localStorage.getItem(KEYS.chat)) {
                localStorage.setItem(KEYS.chat, '[]');
            }
            // Initialize reviews and borrowed history
            if (snapshot.reviews) {
                localStorage.setItem(KEYS.reviews, JSON.stringify(snapshot.reviews));
            } else if (!localStorage.getItem(KEYS.reviews)) {
                localStorage.setItem(KEYS.reviews, '[]');
            }
            if (snapshot.borrowedHistory) {
                localStorage.setItem(KEYS.borrowedHistory, JSON.stringify(snapshot.borrowedHistory));
            } else if (!localStorage.getItem(KEYS.borrowedHistory)) {
                localStorage.setItem(KEYS.borrowedHistory, '[]');
            }
            return true;
        } catch (err) {
            return false;
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
        ensureSeeded: ensureSeeded,
        hydrateFromApi: hydrateFromApi
    };
})();

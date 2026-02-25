// Authentication Functionality

// Default Admin Credentials
const DEFAULT_ADMIN_EMAIL = 'anlinpunneli@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Anlin20#69';

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

async function loginWithApi(email, password, role) {
    return requestJson('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, role })
    });
}

async function registerWithApi(firstName, lastName, email, password) {
    return requestJson('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, email, password })
    });
}

function ensureDefaultUsers() {
    const usersRaw = localStorage.getItem('lib_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    const hasAdmin = users.some((user) => user.email === DEFAULT_ADMIN_EMAIL);
    const hasLibrarian = users.some((user) => user.email === 'librarian@entity.com');

    if (!hasAdmin) {
        users.push({
            id: 'U001',
            email: DEFAULT_ADMIN_EMAIL,
            password: DEFAULT_ADMIN_PASSWORD,
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            createdDate: new Date().toISOString()
        });
    }

    if (!hasLibrarian) {
        users.push({
            id: 'U002',
            email: 'librarian@entity.com',
            password: 'Librarian123!',
            role: 'librarian',
            firstName: 'Library',
            lastName: 'Staff',
            createdDate: new Date().toISOString()
        });
    }

    localStorage.setItem('lib_users', JSON.stringify(users));
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        return;
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.querySelector('input[name="remember"]');

        // Basic validation
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Get role from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        let role = urlParams.get('role') || 'student';

        // Check for default admin credentials
        if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
            role = 'admin';
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userName', 'Admin User');

            if (remember && remember.checked) {
                localStorage.setItem('rememberMe', 'true');
            }

            alert('Welcome Admin!');
            redirectToDashboard('admin');
            return;
        }

        let finalRole = role;
        let memberId = '';

        try {
            const payload = await loginWithApi(email, password, role);
            finalRole = payload.role || role;
            memberId = payload.memberId || '';
            if (payload.firstName || payload.lastName) {
                const fullName = [payload.firstName || '', payload.lastName || ''].join(' ').trim();
                if (fullName) {
                    localStorage.setItem('userName', fullName);
                }
            }
            if (window.LibraryStore && window.LibraryStore.hydrateFromApi) {
                window.LibraryStore.hydrateFromApi();
            }
        } catch (apiError) {
            const usersRaw = localStorage.getItem('lib_users');
            const users = usersRaw ? JSON.parse(usersRaw) : [];
            const matchedUser = users.find((user) => user.email === email && user.password === password);

            if (!matchedUser) {
                const storedUserRaw = localStorage.getItem('userData');
                const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
                if (!storedUser || storedUser.email !== email || storedUser.password !== password) {
                    alert('Invalid email or password');
                    return;
                }
            } else {
                finalRole = matchedUser.role;
                memberId = matchedUser.memberId || '';
            }
        }

        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', finalRole);
        localStorage.setItem('isLoggedIn', 'true');
        if (memberId) {
            localStorage.setItem('userMemberId', memberId);
        }

        if (remember && remember.checked) {
            localStorage.setItem('rememberMe', 'true');
        }

        // Redirect to appropriate dashboard
        redirectToDashboard(finalRole);
    });

    // Display role in the page
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role') || 'student';
    const roleDisplay = document.getElementById('roleDisplay');
    if (roleDisplay) {
        const roleNames = {
            'admin': 'Admin',
            'librarian': 'Librarian',
            'student': 'Student'
        };
        roleDisplay.textContent = `Login as ${roleNames[role] || 'Student'}`;
    }
}

function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        return;
    }

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.querySelector('input[name="terms"]').checked;

        // SECURITY RULE: Force student role from public registration
        // Only admin can create admin/librarian accounts from admin panel
        const role = 'student';

        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        if (!terms) {
            alert('Please accept the terms and conditions');
            return;
        }

        let newMemberId = '';

        try {
            const payload = await registerWithApi(firstName, lastName, email, password);
            newMemberId = payload.memberId || '';
            if (window.LibraryStore && window.LibraryStore.hydrateFromApi) {
                window.LibraryStore.hydrateFromApi();
            }
        } catch (apiError) {
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
                role: role,
                registeredDate: new Date().toISOString()
            };

            localStorage.setItem('userData', JSON.stringify(userData));

            const usersRaw = localStorage.getItem('lib_users');
            const users = usersRaw ? JSON.parse(usersRaw) : [];
            const membersRaw = localStorage.getItem('lib_members');
            const members = membersRaw ? JSON.parse(membersRaw) : [];

            newMemberId = 'M' + String(members.length + 1).padStart(3, '0');
            members.push({
                id: newMemberId,
                name: firstName + ' ' + lastName,
                email: email,
                phone: '',
                type: 'Student'
            });

            users.push({
                id: 'U' + String(users.length + 1).padStart(3, '0'),
                email: email,
                password: password,
                role: role,
                firstName: firstName,
                lastName: lastName,
                memberId: newMemberId,
                createdDate: new Date().toISOString()
            });

            localStorage.setItem('lib_members', JSON.stringify(members));
            localStorage.setItem('lib_users', JSON.stringify(users));
        }

        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', role);
        if (newMemberId) {
            localStorage.setItem('userMemberId', newMemberId);
        }

        // Show success message
        alert('Registration successful! You are registered as a Student. Redirecting to login...');

        // Redirect to login
        setTimeout(() => {
            window.location.href = `login.html?role=${role}`;
        }, 1500);
    });
}

function setupAuthForms() {
    ensureDefaultUsers();
    setupLoginForm();
    setupRegisterForm();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthForms);
} else {
    setupAuthForms();
}

// Function to redirect to dashboard based on role
function redirectToDashboard(role) {
    const dashboards = {
        'admin': 'dashboard/admin.html',
        'librarian': 'dashboard/faculty.html',  // librarian uses faculty.html
        'student': 'dashboard/student.html'
    };
    
    const dashboardUrl = dashboards[role] || 'dashboard/student.html';
    window.location.href = dashboardUrl;
}

// Admin function to create user accounts (Admin/Librarian only)
// This should only be accessible from the admin panel
function createUserAccount(email, password, role, firstName, lastName) {
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    
    if (currentUserRole !== 'admin') {
        alert('Unauthorized: Only admins can create Admin/Librarian accounts');
        return false;
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'librarian' && role !== 'student') {
        alert('Invalid role specified');
        return false;
    }
    
    // This is a placeholder for actual user creation
    // In a real application, this would make an API call to the backend
    const newUser = {
        email: email,
        role: role,
        firstName: firstName,
        lastName: lastName,
        createdBy: localStorage.getItem('userEmail'),
        createdDate: new Date().toISOString()
    };
    
    console.log('New user created:', newUser);
    alert(`User account created successfully!\nRole: ${role}\nEmail: ${email}`);
    
    return true;
}

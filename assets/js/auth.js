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

async function registerWithApi(firstName, lastName, email, password, studentId) {
    return requestJson('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, email, password, studentId })
    });
}

function ensureDefaultUsers() {
    const usersRaw = localStorage.getItem('lib_users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    const hasAdmin = users.some((user) => user.email === DEFAULT_ADMIN_EMAIL);

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

    // Removed fake U002 librarian - create real librarians from admin panel

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

        // Clear previous user's name to avoid showing wrong name
        localStorage.removeItem('userName');

        // Get role from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        let role = urlParams.get('role') || 'student';

        // Check for default admin credentials
        if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
            role = 'admin';
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('isLoggedIn', 'true');
            
            // Try to get actual admin name from users data
            const usersRaw = localStorage.getItem('lib_users');
            const users = usersRaw ? JSON.parse(usersRaw) : [];
            const adminUser = users.find(u => u.email === email && u.role === 'admin');
            
            if (adminUser && (adminUser.firstName || adminUser.lastName)) {
                const fullName = [adminUser.firstName || '', adminUser.lastName || ''].join(' ').trim();
                if (fullName) {
                    localStorage.setItem('userName', fullName);
                } else {
                    localStorage.setItem('userName', 'Admin');
                }
            } else {
                localStorage.setItem('userName', 'Admin');
            }

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
                } else {
                    // Set default name based on role
                    const defaultName = finalRole === 'librarian' ? 'Librarian' : 'Student';
                    localStorage.setItem('userName', defaultName);
                }
            } else {
                // Set default name based on role
                const defaultName = finalRole === 'librarian' ? 'Librarian' : 'Student';
                localStorage.setItem('userName', defaultName);
            }
            if (window.LibraryStore && window.LibraryStore.hydrateFromApi) {
                window.LibraryStore.hydrateFromApi();
            }
        } catch (apiError) {
            console.log('API login failed, checking localStorage');
            const usersRaw = localStorage.getItem('lib_users');
            const users = usersRaw ? JSON.parse(usersRaw) : [];
            
            console.log('Total users in localStorage:', users.length);
            
            // Trim email and password to avoid whitespace issues
            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();
            
            const matchedUser = users.find((user) => 
                user.email.trim() === trimmedEmail && 
                user.password === trimmedPassword
            );

            if (!matchedUser) {
                console.log('User not found in lib_users, checking userData fallback');
                const storedUserRaw = localStorage.getItem('userData');
                const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
                if (!storedUser || storedUser.email.trim() !== trimmedEmail || storedUser.password !== trimmedPassword) {
                    console.error('Login failed: No matching user found');
                    alert('Invalid email or password. Please check your credentials and try again.');
                    return;
                }
                // If userData matches, use it
                console.log('User found in userData fallback');
            } else {
                console.log('User found in lib_users:', matchedUser.email);
                finalRole = matchedUser.role;
                memberId = matchedUser.memberId || '';
                
                // Set userName if available
                if (matchedUser.firstName || matchedUser.lastName) {
                    const fullName = [matchedUser.firstName || '', matchedUser.lastName || ''].join(' ').trim();
                    if (fullName) {
                        localStorage.setItem('userName', fullName);
                    } else {
                        const defaultName = matchedUser.role === 'librarian' ? 'Librarian' : 'Student';
                        localStorage.setItem('userName', defaultName);
                    }
                } else {
                    const defaultName = matchedUser.role === 'librarian' ? 'Librarian' : 'Student';
                    localStorage.setItem('userName', defaultName);
                }
            }
        }

        // Update last login time for this user
        const usersRaw = localStorage.getItem('lib_users');
        if (usersRaw) {
            const users = JSON.parse(usersRaw);
            const userIndex = users.findIndex((user) => user.email === email);
            if (userIndex !== -1) {
                users[userIndex].lastLogin = new Date().toISOString();
                if (!users[userIndex].firstName && !users[userIndex].lastName) {
                    // Try to get name from localStorage if available
                    const userName = localStorage.getItem('userName');
                    if (userName && userName !== 'Admin User') {
                        const nameParts = userName.trim().split(' ');
                        if (nameParts.length >= 2) {
                            users[userIndex].firstName = nameParts[0];
                            users[userIndex].lastName = nameParts.slice(1).join(' ');
                        }
                    }
                }
                localStorage.setItem('lib_users', JSON.stringify(users));
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
        const photoInput = document.getElementById('profilePhoto');

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

        // Check for duplicate email first
        const usersRaw = localStorage.getItem('lib_users');
        const existingUsers = usersRaw ? JSON.parse(usersRaw) : [];
        
        const emailExists = existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            alert('This email is already registered. Please login instead.');
            setTimeout(() => {
                window.location.href = `login.html?role=${role}`;
            }, 500);
            return;
        }

        let newMemberId = '';
        let profilePhotoBase64 = '';

        // Handle profile photo if uploaded
        if (photoInput && photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            const reader = new FileReader();
            
            // Create a promise to handle async file reading
            const photoPromise = new Promise((resolve) => {
                reader.onload = function(e) {
                    profilePhotoBase64 = e.target.result;
                    resolve();
                };
                reader.readAsDataURL(file);
            });
            
            // Wait for photo to be processed
            await photoPromise;
        }

        try {
            const payload = await registerWithApi(firstName, lastName, email, password, '');
            newMemberId = payload.memberId || '';
            
            // Show the assigned student ID in the input field
            const studentIdField = document.getElementById('studentId');
            if (studentIdField && newMemberId) {
                studentIdField.value = newMemberId;
            }
            
            if (window.LibraryStore && window.LibraryStore.hydrateFromApi) {
                window.LibraryStore.hydrateFromApi();
            }
        } catch (apiError) {
            console.log('API registration failed, using localStorage fallback');
            
            const membersRaw = localStorage.getItem('lib_members');
            const members = membersRaw ? JSON.parse(membersRaw) : [];
            const users = existingUsers; // Use the already loaded users array

            // Auto-generate student ID in ENT#### format
            let maxNum = 0;
            members.forEach((member) => {
                const id = member.id || '';
                if (id.startsWith('ENT')) {
                    const num = parseInt(id.substring(3), 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });
            newMemberId = 'ENT' + String(maxNum + 1).padStart(4, '0');
            
            // Show the assigned student ID
            const studentIdField = document.getElementById('studentId');
            if (studentIdField) {
                studentIdField.value = newMemberId;
            }
            
            // Check if member ID already exists (shouldn't happen with auto-generation)
            const memberExists = members.some(m => m.id === newMemberId);
            if (!memberExists) {
                members.push({
                    id: newMemberId,
                    name: firstName + ' ' + lastName,
                    email: email,
                    phone: '',
                    type: 'Student',
                    profilePhoto: profilePhotoBase64,
                    createdDate: new Date().toISOString()
                });
                localStorage.setItem('lib_members', JSON.stringify(members));
            }

            // Add new user
            const newUser = {
                id: 'U' + String(users.length + 1).padStart(3, '0'),
                email: email,
                password: password,
                role: role,
                firstName: firstName,
                lastName: lastName,
                memberId: newMemberId,
                profilePhoto: profilePhotoBase64,
                createdDate: new Date().toISOString()
            };
            
            users.push(newUser);
            localStorage.setItem('lib_users', JSON.stringify(users));
            
            // Also save to userData for backward compatibility
            const userData = {
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: password,
                role: role,
                registeredDate: new Date().toISOString()
            };
            localStorage.setItem('userData', JSON.stringify(userData));
            
            console.log('User registered successfully in localStorage');
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

// Redirect and Authentication Check

// Splash Screen Handler
function initializeSplashScreen() {
    const splashScreen = document.getElementById('splashScreen');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (splashScreen && dashboardContent) {
        console.log('Splash screen initialized');
        
        // Show splash screen for 3 seconds
        setTimeout(function() {
            console.log('Starting fade out');
            splashScreen.classList.add('fade-out');
            
            // Show dashboard content after splash fades out
            setTimeout(function() {
                console.log('Showing dashboard');
                dashboardContent.style.opacity = '1';
                dashboardContent.style.visibility = 'visible';
                dashboardContent.style.transition = 'opacity 0.8s ease-in-out';
                setTimeout(function() {
                    splashScreen.style.display = 'none';
                }, 100);
            }, 200);
        }, 3000);
    }
}

// Check if user is logged in
function checkAuthStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    
    // If not logged in and trying to access dashboard, redirect to login
    if (!isLoggedIn && window.location.pathname.includes('dashboard')) {
        window.location.href = '../index.html';
    }
    
    return {
        isLoggedIn: isLoggedIn === 'true',
        userRole: userRole
    };
}

// Load user information
function loadUserInfo() {
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    
    // Display user name if element exists
    const userNameElement = document.getElementById('userName');
    if (userNameElement && userName) {
        userNameElement.textContent = userName;
    } else if (userNameElement && userEmail) {
        userNameElement.textContent = userEmail.split('@')[0];
    }
    
    return {
        email: userEmail,
        name: userName,
        role: userRole
    };
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    const auth = checkAuthStatus();
    
    // Initialize splash screen
    initializeSplashScreen();
    
    // Load user information
    const userInfo = loadUserInfo();
    
    // Add logout functionality to buttons
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', logout);
    });
});

// Handle browser back button
window.addEventListener('popstate', function() {
    checkAuthStatus();
});

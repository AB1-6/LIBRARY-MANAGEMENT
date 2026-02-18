// Popup Modal Functionality

// Splash Screen Handler for Landing Page
function initializeLandingSplash() {
    const splashScreen = document.getElementById('splashScreen');
    const pageContent = document.getElementById('pageContent');
    
    if (splashScreen && pageContent) {
        console.log('Landing splash screen initialized - showing for 3 seconds');
        
        // Show splash screen for 3 seconds
        setTimeout(function() {
            console.log('Starting splash fade out');
            splashScreen.classList.add('fade-out');
            
            // Show page content
            setTimeout(function() {
                console.log('Showing page content');
                pageContent.classList.add('show');
            }, 100);
            
            // Hide splash screen after animation completes
            setTimeout(function() {
                splashScreen.style.display = 'none';
            }, 800);
        }, 3000);
    } else {
        console.log('Splash elements not found, showing page immediately');
        if (pageContent) {
            pageContent.classList.add('show');
        }
    }
}

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    initializeLandingSplash();
    
    // Setup modal handlers
    setupModalHandlers();
});

function setupModalHandlers() {
    const modal = document.getElementById('popupModal');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const closeBtn = document.querySelector('.close');

    // Open modal when "Get Started" button is clicked
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
            console.log('Get Started clicked');
            modal.classList.add('show');
        });
    }

    // Close modal when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('Close button clicked');
            modal.classList.remove('show');
        });
    }

    // Close modal when clicking outside of the modal content
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            console.log('Clicked outside modal');
            modal.classList.remove('show');
        }
    });
}

// Smooth animation for popup appearance
function showPopupWithAnimation() {
    const modal = document.getElementById('popupModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Optional: Auto-show popup after delay
// setTimeout(showPopupWithAnimation, 2000);

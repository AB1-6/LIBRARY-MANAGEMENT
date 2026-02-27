/**
 * Mobile UI Helper
 * Handles mobile-specific functionality for the dashboard
 */

(function() {
    'use strict';

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        setupMobileMenu();
        setupTableScroll();
        wrapTables();
    }

    /**
     * Setup mobile menu toggle
     */
    function setupMobileMenu() {
        // Create mobile menu toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-menu-toggle';
        toggleBtn.innerHTML = '☰';
        toggleBtn.setAttribute('aria-label', 'Toggle menu');
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        
        // Insert before dashboard container
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.parentNode.insertBefore(toggleBtn, dashboardContainer);
            dashboardContainer.parentNode.insertBefore(overlay, dashboardContainer);
        }

        const sidebar = document.querySelector('.sidebar');
        
        // Toggle menu
        function toggleMenu() {
            if (sidebar) {
                sidebar.classList.toggle('mobile-open');
                overlay.classList.toggle('show');
                toggleBtn.innerHTML = sidebar.classList.contains('mobile-open') ? '×' : '☰';
            }
        }

        // Event listeners
        toggleBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);

        // Close menu when clicking menu items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('mobile-open');
                    overlay.classList.remove('show');
                    toggleBtn.innerHTML = '☰';
                }
            });
        });

        // Close menu on window resize if opened
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebar) {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('show');
                toggleBtn.innerHTML = '☰';
            }
        });
    }

    /**
     * Wrap tables in responsive containers
     */
    function wrapTables() {
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            // Check if already wrapped
            if (table.parentElement.classList.contains('table-responsive')) {
                return;
            }

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            
            // Wrap table
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    /**
     * Setup table scroll indicators
     */
    function setupTableScroll() {
        // Use event delegation for tables that might be added dynamically
        document.addEventListener('scroll', handleTableScroll, true);
        
        function handleTableScroll(e) {
            const wrapper = e.target.closest ? e.target.closest('.table-responsive') : null;
            if (wrapper) {
                checkScrollPosition(wrapper);
            }
        }

        // Check scroll position for all tables initially
        const wrappers = document.querySelectorAll('.table-responsive');
        wrappers.forEach(wrapper => {
            wrapper.addEventListener('scroll', () => checkScrollPosition(wrapper));
            checkScrollPosition(wrapper);
        });

        function checkScrollPosition(wrapper) {
            const scrollLeft = wrapper.scrollLeft;
            const scrollWidth = wrapper.scrollWidth;
            const clientWidth = wrapper.clientWidth;
            
            // Check if scrolled to end
            if (scrollLeft + clientWidth >= scrollWidth - 10) {
                wrapper.classList.add('scrolled-end');
            } else {
                wrapper.classList.remove('scrolled-end');
            }
        }
    }

    /**
     * Improve button touch targets on mobile
     */
    function improveTouchTargets() {
        if (window.innerWidth <= 768) {
            const smallButtons = document.querySelectorAll('.btn-sm, .btn');
            smallButtons.forEach(btn => {
                const height = btn.offsetHeight;
                if (height < 44) {
                    btn.style.minHeight = '44px';
                    btn.style.display = 'inline-flex';
                    btn.style.alignItems = 'center';
                    btn.style.justifyContent = 'center';
                }
            });
        }
    }

    // Re-run when content changes (for dynamically loaded tables)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                wrapTables();
                setupTableScroll();
            }
        });
    });

    // Observe the dashboard content area
    const dashboardContent = document.querySelector('.dashboard-content');
    if (dashboardContent) {
        observer.observe(dashboardContent, {
            childList: true,
            subtree: true
        });
    }

})();

/**
 * Dark Mode System
 * Handles theme switching and persistence
 */

const DarkMode = {
    STORAGE_KEY: 'lib_darkMode',
    
    init() {
        // Load saved preference or default to light
        const savedMode = localStorage.getItem(this.STORAGE_KEY);
        if (savedMode === 'dark') {
            this.enable();
        }
        
        // Add toggle button to all dashboards
        this.addToggleButton();
    },
    
    enable() {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(this.STORAGE_KEY, 'dark');
        this.updateToggleIcon();
    },
    
    disable() {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(this.STORAGE_KEY, 'light');
        this.updateToggleIcon();
    },
    
    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            this.disable();
        } else {
            this.enable();
        }
    },
    
    addToggleButton() {
        const header = document.querySelector('.dashboard-header');
        if (!header) return;
        
        const toggle = document.createElement('button');
        toggle.id = 'darkModeToggle';
        toggle.className = 'dark-mode-toggle';
        toggle.title = 'Toggle dark mode';
        toggle.innerHTML = '<span class="theme-icon">🌙</span>';
        toggle.onclick = () => this.toggle();
        
        // Insert before user profile
        const userProfile = header.querySelector('.user-profile');
        if (userProfile) {
            header.insertBefore(toggle, userProfile);
        } else {
            header.appendChild(toggle);
        }
        
        this.updateToggleIcon();
    },
    
    updateToggleIcon() {
        const toggle = document.getElementById('darkModeToggle');
        if (!toggle) return;
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        toggle.innerHTML = `<span class="theme-icon">${isDark ? '☀️' : '🌙'}</span>`;
    }
};

// Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DarkMode.init());
} else {
    DarkMode.init();
}

// Make available globally
window.DarkMode = DarkMode;

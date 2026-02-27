/**
 * Image Lightbox
 * Zoom and view images in full screen
 */

const Lightbox = {
    overlay: null,
    
    init() {
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'lightbox-overlay';
        this.overlay.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close" onclick="Lightbox.close()">×</button>
                <img src="" alt="Preview">
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });
    },
    
    open(imageSrc) {
        this.init();
        
        const img = this.overlay.querySelector('img');
        img.src = imageSrc;
        
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    close() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
};

/**
 * Animated Counter
 * Count up animation for statistics
 */
const AnimatedCounter = {
    animate(element, target, duration = 1000) {
        const start = 0;
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * easeOutQuart);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        };
        
        requestAnimationFrame(updateCounter);
    },
    
    animateAll(selector = '.stat-number') {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((element, index) => {
            const target = parseInt(element.textContent.replace(/,/g, '')) || 0;
            
            // Stagger animations slightly
            setTimeout(() => {
                this.animate(element, target, 1200);
            }, index * 100);
        });
    }
};

/**
 * Skeleton Loader Manager
 */
const SkeletonLoader = {
    show(container, type = 'card', count = 3) {
        const skeletons = [];
        
        for (let i = 0; i < count; i++) {
            skeletons.push(this.createSkeleton(type));
        }
        
        container.innerHTML = skeletons.join('');
    },
    
    createSkeleton(type) {
        switch (type) {
            case 'card':
                return `
                    <div class="skeleton-card skeleton">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text" style="width: 80%;"></div>
                    </div>
                `;
            case 'table-row':
                return `
                    <tr>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                        <td><div class="skeleton skeleton-text"></div></td>
                    </tr>
                `;
            case 'book-card':
                return `
                    <div class="book-card">
                        <div class="skeleton skeleton-image"></div>
                        <div style="padding: 16px;">
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton skeleton-text" style="width: 70%;"></div>
                        </div>
                    </div>
                `;
            default:
                return '<div class="skeleton" style="height: 100px;"></div>';
        }
    },
    
    hide(container) {
        const skeletons = container.querySelectorAll('.skeleton');
        skeletons.forEach(s => s.remove());
    }
};

/**
 * Empty State Manager
 */
const EmptyState = {
    show(container, options = {}) {
        const defaults = {
            icon: '📚',
            title: 'No data available',
            description: 'There\'s nothing here yet.',
            actionText: null,
            actionCallback: null
        };
        
        const config = { ...defaults, ...options };
        
        const actionHtml = config.actionText ? `
            <button class="btn btn-primary" onclick="this.emptyStateAction()">
                ${config.actionText}
            </button>
        ` : '';
        
        container.innerHTML = `
            <div class="empty-state fade-in">
                <div class="empty-state-icon">${config.icon}</div>
                <h3 class="empty-state-title">${config.title}</h3>
                <p class="empty-state-description">${config.description}</p>
                ${actionHtml}
            </div>
        `;
        
        if (config.actionCallback) {
            container.emptyStateAction = config.actionCallback;
        }
    }
};

// Make globally available
window.Lightbox = Lightbox;
window.AnimatedCounter = AnimatedCounter;
window.SkeletonLoader = SkeletonLoader;
window.EmptyState = EmptyState;

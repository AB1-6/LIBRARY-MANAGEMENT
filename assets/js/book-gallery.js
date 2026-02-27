/**
 * Book Gallery View with Flip Animation
 * Grid display with book covers and flip-on-hover details
 */

const BookGallery = {
    currentView: 'table',
    container: null,
    books: [],
    
    /**
     * Initialize gallery view
     */
    init(containerId, books) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('Gallery container not found:', containerId);
            return;
        }
        
        this.container = container;
        this.books = books || [];
        
        // Add view toggle buttons if not exists
        this.addViewToggle();
        
        // Render current view
        this.render();
    },
    
    /**
     * Add view toggle buttons
     */
    addViewToggle() {
        // Check if toggle already exists
        if (this.container.querySelector('.view-toggle')) {
            return;
        }
        
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'view-toggle';
        toggleContainer.innerHTML = `
            <button class="view-toggle-btn ${this.currentView === 'table' ? 'active' : ''}" data-view="table">
                📋 Table View
            </button>
            <button class="view-toggle-btn ${this.currentView === 'gallery' ? 'active' : ''}" data-view="gallery">
                🎨 Gallery View
            </button>
        `;
        
        // Add event listeners
        toggleContainer.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });
        
        // Insert before the table or at the beginning
        const table = this.container.querySelector('table');
        if (table) {
            this.container.insertBefore(toggleContainer, table);
        } else {
            this.container.insertBefore(toggleContainer, this.container.firstChild);
        }
    },
    
    /**
     * Switch between table and gallery view
     */
    switchView(view) {
        this.currentView = view;
        
        // Update button states
        this.container.querySelectorAll('.view-toggle-btn').forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.render();
    },
    
    /**
     * Render current view
     */
    render() {
        if (this.currentView === 'gallery') {
            this.showGallery();
        } else {
            this.showTable();
        }
    },
    
    /**
     * Show table view
     */
    showTable() {
        const table = this.container.querySelector('table');
        const gallery = this.container.querySelector('.book-gallery');
        
        if (table) table.style.display = 'table';
        if (gallery) gallery.remove();
    },
    
    /**
     * Show gallery view
     */
    showGallery() {
        const table = this.container.querySelector('table');
        if (table) table.style.display = 'none';
        
        // Remove existing gallery
        const existingGallery = this.container.querySelector('.book-gallery');
        if (existingGallery) existingGallery.remove();
        
        // Create gallery container
        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'book-gallery';
        
        // Add books to gallery
        if (this.books.length === 0) {
            galleryContainer.innerHTML = this.renderEmptyState();
        } else {
            this.books.forEach(book => {
                const card = this.createBookCard(book);
                galleryContainer.appendChild(card);
            });
        }
        
        // Insert gallery
        if (table) {
            this.container.insertBefore(galleryContainer, table);
        } else {
            this.container.appendChild(galleryContainer);
        }
    },
    
    /**
     * Create a book card with flip animation
     */
    createBookCard(book) {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.dataset.bookId = book.id;
        
        const coverImage = book.coverImage 
            ? `<img src="${book.coverImage}" alt="${book.title}" onerror="this.parentElement.innerHTML='📚'">`
            : '<div class="book-cover-placeholder">📚</div>';
        
        const isAvailable = book.availableCopies > 0;
        const statusClass = isAvailable ? 'status-available' : 'status-unavailable';
        const statusText = isAvailable ? `✓ ${book.availableCopies} Available` : '✕ Not Available';
        
        card.innerHTML = `
            <div class="book-card-inner">
                <!-- Front of Card -->
                <div class="book-card-front">
                    <div class="book-cover-image">
                        ${coverImage}
                    </div>
                    <div class="book-card-info">
                        <h3 class="book-card-title" title="${book.title}">${book.title}</h3>
                        <p class="book-card-author" title="${book.author}">${book.author}</p>
                        <span class="book-card-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <!-- Back of Card -->
                <div class="book-card-back">
                    <h3>${book.title}</h3>
                    <div class="book-details">
                        <div class="book-detail-item">
                            <div class="book-detail-label">Author</div>
                            <div class="book-detail-value">${book.author}</div>
                        </div>
                        <div class="book-detail-item">
                            <div class="book-detail-label">Category</div>
                            <div class="book-detail-value">${book.category || 'N/A'}</div>
                        </div>
                        <div class="book-detail-item">
                            <div class="book-detail-label">ISBN</div>
                            <div class="book-detail-value">${book.isbn || 'N/A'}</div>
                        </div>
                        <div class="book-detail-item">
                            <div class="book-detail-label">Publisher</div>
                            <div class="book-detail-value">${book.publisher || 'N/A'}</div>
                        </div>
                        <div class="book-detail-item">
                            <div class="book-detail-label">Copies</div>
                            <div class="book-detail-value">${book.availableCopies} / ${book.totalCopies}</div>
                        </div>
                    </div>
                    <div class="book-card-actions">
                        <button class="card-action-btn" onclick="editBook('${book.id}')">✏️ Edit</button>
                        <button class="card-action-btn" onclick="deleteBook('${book.id}')">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    },
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="gallery-empty">
                <div class="gallery-empty-icon">📚</div>
                <div class="gallery-empty-text">No books found</div>
                <div class="gallery-empty-subtext">Add some books to see them in gallery view</div>
            </div>
        `;
    },
    
    /**
     * Update books and refresh gallery
     */
    updateBooks(books) {
        this.books = books;
        if (this.currentView === 'gallery') {
            this.showGallery();
        }
    },
    
    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.BookGallery = BookGallery;
}

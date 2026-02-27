/**
 * Book Gallery View
 * Grid display with cover images
 */

const GalleryView = {
    currentView: 'table', // 'table' or 'gallery'
    
    init(containerId, books, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.books = books || [];
        this.options = {
            showActions: true,
            onBookClick: null,
            onEditClick: null,
            onDeleteClick: null,
            ...options
        };
        
        this.addViewToggle();
        this.render();
    },
    
    addViewToggle() {
        const existingToggle = document.querySelector('.view-toggle');
        if (existingToggle) return;
        
        const toggle = document.createElement('div');
        toggle.className = 'view-toggle';
        toggle.innerHTML = `
            <button class="view-toggle-btn ${this.currentView === 'table' ? 'active' : ''}" data-view="table">
                📋 Table View
            </button>
            <button class="view-toggle-btn ${this.currentView === 'gallery' ? 'active' : ''}" data-view="gallery">
                🎨 Gallery View
            </button>
        `;
        
        toggle.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        this.container.parentElement.insertBefore(toggle, this.container);
    },
    
    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.render();
    },
    
    render() {
        if (this.currentView === 'gallery') {
            this.renderGallery();
        } else {
            this.renderTable();
        }
    },
    
    renderGallery() {
        const galleryHtml = `
            <div class="book-gallery fade-in">
                ${this.books.map(book => this.createBookCard(book)).join('')}
            </div>
        `;
        
        this.container.innerHTML = galleryHtml;
        
        // Add click handlers
        this.container.querySelectorAll('.book-card').forEach((card, index) => {
            const book = this.books[index];
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.book-card-actions')) return;
                if (this.options.onBookClick) {
                    this.options.onBookClick(book);
                } else {
                    this.showBookDetails(book);
                }
            });
            
            // Image zoom
            const img = card.querySelector('.book-card-cover');
            if (img && img.src && !img.src.includes('data:image/svg')) {
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Lightbox.open(img.src);
                });
            }
        });
    },
    
    renderTable() {
        // Show original table
        const table = this.container.querySelector('table');
        if (table) {
            table.style.display = 'table';
        }
        
        const gallery = this.container.querySelector('.book-gallery');
        if (gallery) {
            gallery.remove();
        }
    },
    
    createBookCard(book) {
        const coverImage = book.coverImage || window.ImageHelper?.getPlaceholder() || '';
        const available = book.availableCopies > 0;
        const statusClass = available ? 'available' : 'issued';
        const statusText = available ? 'Available' : 'Not Available';
        
        return `
            <div class="book-card" data-book-id="${book.id}">
                <img src="${coverImage}" 
                     class="book-card-cover" 
                     alt="${book.title}"
                     onerror="this.src=ImageHelper.getPlaceholder()">
                <div class="book-card-body">
                    <h3 class="book-card-title">${book.title}</h3>
                    <p class="book-card-author">by ${book.author}</p>
                    <div class="book-card-footer">
                        <span class="status-badge status-badge-${statusClass}">
                            ${available ? '✓' : '✕'} ${statusText}
                        </span>
                        <span class="book-card-copies">${book.availableCopies}/${book.totalCopies}</span>
                    </div>
                    ${this.options.showActions ? `
                        <div class="book-card-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                            <button class="btn-icon" onclick="event.stopPropagation(); editBook('${book.id}')" style="flex: 1; font-size: 0.85rem;">Edit</button>
                            <button class="btn-icon" onclick="event.stopPropagation(); fetchSingleBookCover('${book.id}')" style="flex: 1; font-size: 0.85rem;" title="Fetch cover">🖼️</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    showBookDetails(book) {
        const coverImage = book.coverImage || window.ImageHelper?.getPlaceholder() || '';
        
        if (window.ModalUI) {
            window.ModalUI.openSimple('Book Details', `
                <div style="text-align: center;">
                    <img src="${coverImage}" 
                         style="max-width: 300px; max-height: 400px; border-radius: 12px; margin-bottom: 20px; cursor: zoom-in;"
                         onclick="Lightbox.open('${coverImage}')"
                         onerror="this.src=ImageHelper.getPlaceholder()">
                    <h2 style="margin: 0 0 8px 0;">${book.title}</h2>
                    <p style="color: #666; margin: 0 0 20px 0;">by ${book.author}</p>
                    <div style="text-align: left;">
                        <p><strong>Category:</strong> ${book.category}</p>
                        <p><strong>Total Copies:</strong> ${book.totalCopies}</p>
                        <p><strong>Available:</strong> ${book.availableCopies}</p>
                        ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
                        ${book.description ? `<p><strong>Description:</strong> ${book.description}</p>` : ''}
                    </div>
                </div>
            `);
        }
    },
    
    updateBooks(books) {
        this.books = books;
        this.render();
    }
};

window.GalleryView = GalleryView;

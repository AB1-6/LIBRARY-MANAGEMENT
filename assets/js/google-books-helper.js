// Google Books API Helper for fetching book covers
(function() {
    'use strict';

    const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
    
    // Fetch book cover from Google Books API with multiple fallback strategies
    async function fetchBookCover(title, author) {
        try {
            // Clean up title and author
            const cleanTitle = title.trim();
            const cleanAuthor = author ? author.trim() : '';
            
            // Try multiple search strategies in order of specificity
            const searchStrategies = [
                // Strategy 1: Exact title + author
                cleanAuthor ? `intitle:"${cleanTitle}"+inauthor:"${cleanAuthor}"` : null,
                // Strategy 2: Title keywords + author
                cleanAuthor ? `${cleanTitle}+${cleanAuthor}` : null,
                // Strategy 3: Just title (flexible)
                `intitle:${cleanTitle}`,
                // Strategy 4: General search with title and author
                cleanAuthor ? `"${cleanTitle}" "${cleanAuthor}"` : `"${cleanTitle}"`,
                // Strategy 5: Title keywords only
                cleanTitle
            ].filter(Boolean);
            
            for (const query of searchStrategies) {
                const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=3`;
                const response = await fetch(url);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.items && data.items.length > 0) {
                    // Try to find best match with image
                    for (const item of data.items) {
                        const book = item.volumeInfo;
                        
                        // Skip if no image
                        if (!book.imageLinks) continue;
                        
                        // Get highest quality image available
                        let coverUrl = book.imageLinks.extraLarge ||
                                      book.imageLinks.large ||
                                      book.imageLinks.medium ||
                                      book.imageLinks.small ||
                                      book.imageLinks.thumbnail;
                        
                        if (coverUrl) {
                            // Convert http to https for security
                            coverUrl = coverUrl.replace('http://', 'https://');
                            // Remove edge=curl and increase size
                            coverUrl = coverUrl.replace('&edge=curl', '').replace('zoom=1', 'zoom=0');
                            
                            return {
                                success: true,
                                coverUrl: coverUrl,
                                bookData: {
                                    title: book.title,
                                    authors: book.authors ? book.authors.join(', ') : '',
                                    publisher: book.publisher,
                                    publishedDate: book.publishedDate,
                                    description: book.description,
                                    isbn: book.industryIdentifiers ? book.industryIdentifiers[0]?.identifier : null
                                }
                            };
                        }
                    }
                }
            }
            
            // No book found with any strategy
            return {
                success: false,
                error: `No match found in Google Books for "${cleanTitle}"${cleanAuthor ? ` by ${cleanAuthor}` : ''}`
            };
            
        } catch (error) {
            console.error('Error fetching book cover:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Fetch covers for all books in bulk
    async function fetchAllBookCovers(progressCallback, forceRefresh = false) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const results = {
            total: books.length,
            successful: 0,
            failed: 0,
            skipped: 0,
            details: []
        };
        
        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            
            // Skip if book already has a cover (unless force refresh)
            if (!forceRefresh && book.coverImage && book.coverImage.trim() !== '') {
                results.skipped++;
                results.details.push({
                    bookId: book.id,
                    title: book.title,
                    status: 'skipped',
                    message: 'Book already has a cover'
                });
                
                if (progressCallback) {
                    progressCallback(i + 1, books.length, book.title, 'skipped');
                }
                continue;
            }
            
            // Fetch cover from Google Books
            const result = await fetchBookCover(book.title, book.author);
            
            if (result.success && result.coverUrl) {
                // Update book with cover URL
                book.coverImage = result.coverUrl;
                results.successful++;
                results.details.push({
                    bookId: book.id,
                    title: book.title,
                    status: 'success',
                    coverUrl: result.coverUrl
                });
            } else {
                results.failed++;
                results.details.push({
                    bookId: book.id,
                    title: book.title,
                    status: 'failed',
                    error: result.error
                });
            }
            
            if (progressCallback) {
                progressCallback(i + 1, books.length, book.title, result.success ? 'success' : 'failed');
            }
            
            // Small delay to avoid rate limiting (100ms is sufficient)
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Save updated books
        LibraryStore.save(LibraryStore.KEYS.books, books);
        
        return results;
    }
    
    // Fetch cover for a single book by ID
    async function fetchCoverForBook(bookId) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const book = books.find(b => b.id === bookId);
        
        if (!book) {
            return { success: false, error: 'Book not found' };
        }
        
        const result = await fetchBookCover(book.title, book.author);
        
        if (result.success && result.coverUrl) {
            book.coverImage = result.coverUrl;
            LibraryStore.save(LibraryStore.KEYS.books, books);
        }
        
        return result;
    }
    
    // Refresh/replace existing cover
    async function refreshBookCover(bookId) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const book = books.find(b => b.id === bookId);
        
        if (!book) {
            return { success: false, error: 'Book not found' };
        }
        
        const result = await fetchBookCover(book.title, book.author);
        
        if (result.success && result.coverUrl) {
            book.coverImage = result.coverUrl;
            LibraryStore.save(LibraryStore.KEYS.books, books);
        }
        
        return result;
    }
    
    // Show progress modal for bulk operations
    function showBulkProgress(title, message) {
        const existingModal = document.getElementById('bulkProgressModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div class="modal-overlay" id="bulkProgressModal" style="display: flex;">
                <div class="modal-content" style="max-width: 500px; text-align: center;">
                    <h3>${title}</h3>
                    <div style="margin: 20px 0;">
                        <div id="progressBar" style="width: 100%; height: 30px; background: #e0e0e0; border-radius: 15px; overflow: hidden; margin-bottom: 10px;">
                            <div id="progressFill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); transition: width 0.3s;"></div>
                        </div>
                        <div id="progressText" style="font-weight: 500;">${message}</div>
                        <div id="progressDetails" style="margin-top: 10px; font-size: 14px; color: #666;"></div>
                    </div>
                    <div id="progressButtons" style="display: none; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="document.getElementById('bulkProgressModal').remove(); location.reload();">Close & Refresh</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function updateProgress(current, total, bookTitle, status) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        if (progressFill && progressText && progressDetails) {
            const percentage = Math.round((current / total) * 100);
            progressFill.style.width = percentage + '%';
            progressText.textContent = `Processing: ${current} of ${total} (${percentage}%)`;
            
            let statusIcon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏭️';
            progressDetails.textContent = `${statusIcon} ${bookTitle}`;
        }
    }
    
    function showProgressComplete(results) {
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        const progressButtons = document.getElementById('progressButtons');
        
        if (progressText && progressDetails && progressButtons) {
            progressText.innerHTML = '<strong>✅ Complete!</strong>';
            progressDetails.innerHTML = `
                <div style="text-align: left; display: inline-block; margin-top: 10px;">
                    <div>✅ Successful: ${results.successful}</div>
                    <div>❌ Failed: ${results.failed}</div>
                    <div>⏭️ Skipped: ${results.skipped}</div>
                    <div><strong>Total: ${results.total}</strong></div>
                </div>
            `;
            progressButtons.style.display = 'block';
        }
    }
    
    // Public API
    window.GoogleBooksHelper = {
        fetchBookCover: fetchBookCover,
        fetchAllBookCovers: fetchAllBookCovers,
        fetchCoverForBook: fetchCoverForBook,
        refreshBookCover: refreshBookCover,
        showBulkProgress: showBulkProgress,
        updateProgress: updateProgress,
        showProgressComplete: showProgressComplete
    };

})();

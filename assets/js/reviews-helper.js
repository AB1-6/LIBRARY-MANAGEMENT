// Book Reviews & Ratings System
(function() {
    'use strict';

    const REVIEWS_KEY = 'lib_reviews';
    const BORROWED_BOOKS_KEY = 'lib_borrowed_books_history';

    // Get all reviews from localStorage
    function getReviews() {
        return LibraryStore.load(REVIEWS_KEY, []);
    }

    // Save reviews to localStorage
    function saveReviews(reviews) {
        LibraryStore.save(REVIEWS_KEY, reviews);
    }

    // Get borrowed books history (for tracking who can review)
    function getBorrowedHistory() {
        return LibraryStore.load(BORROWED_BOOKS_KEY, []);
    }

    // Save borrowed book history
    function saveBorrowedHistory(history) {
        LibraryStore.save(BORROWED_BOOKS_KEY, history);
    }

    // Add a book to borrowed history when returned
    function addToBorrowedHistory(memberId, bookId, issueDate, returnDate) {
        const history = getBorrowedHistory();
        
        // Check if already exists
        const exists = history.some(h => 
            h.memberId === memberId && 
            h.bookId === bookId && 
            h.issueDate === issueDate
        );

        if (!exists) {
            history.push({
                id: 'BH' + Date.now() + Math.random().toString(36).substr(2, 5),
                memberId: memberId,
                bookId: bookId,
                issueDate: issueDate,
                returnDate: returnDate,
                addedAt: new Date().toISOString()
            });
            saveBorrowedHistory(history);
        }
    }

    // Check if member has borrowed and returned a book (can review)
    function canReview(memberId, bookId) {
        const history = getBorrowedHistory();
        return history.some(h => h.memberId === memberId && h.bookId === bookId);
    }

    // Get reviews for a specific book
    function getBookReviews(bookId) {
        const reviews = getReviews();
        return reviews.filter(r => r.bookId === bookId && r.status === 'approved');
    }

    // Get average rating for a book
    function getBookRating(bookId) {
        const reviews = getBookReviews(bookId);
        if (reviews.length === 0) {
            return {
                average: 0,
                count: 0,
                stars: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            };
        }

        const stars = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        let totalRating = 0;

        reviews.forEach(review => {
            totalRating += review.rating;
            stars[review.rating]++;
        });

        return {
            average: (totalRating / reviews.length).toFixed(1),
            count: reviews.length,
            stars: stars
        };
    }

    // Check if member has already reviewed a book
    function hasReviewed(memberId, bookId) {
        const reviews = getReviews();
        return reviews.some(r => r.memberId === memberId && r.bookId === bookId);
    }

    // Submit a new review
    function submitReview(memberId, bookId, rating, reviewText, memberName) {
        // Validation
        if (!memberId || !bookId || !rating) {
            return { success: false, message: 'Missing required fields' };
        }

        if (rating < 1 || rating > 5) {
            return { success: false, message: 'Rating must be between 1 and 5' };
        }

        // Check if can review
        if (!canReview(memberId, bookId)) {
            return { success: false, message: 'You must borrow and return this book before reviewing' };
        }

        // Check if already reviewed
        if (hasReviewed(memberId, bookId)) {
            return { success: false, message: 'You have already reviewed this book' };
        }

        const reviews = getReviews();
        const newReview = {
            id: 'REV' + Date.now() + Math.random().toString(36).substr(2, 5),
            bookId: bookId,
            memberId: memberId,
            memberName: memberName || 'Anonymous',
            rating: parseInt(rating),
            reviewText: reviewText || '',
            createdAt: new Date().toISOString(),
            status: 'approved', // Auto-approve for now, can add moderation later
            helpful: 0,
            reported: false
        };

        reviews.push(newReview);
        saveReviews(reviews);

        return { success: true, message: 'Review submitted successfully!', review: newReview };
    }

    // Update a review
    function updateReview(reviewId, rating, reviewText) {
        const reviews = getReviews();
        const index = reviews.findIndex(r => r.id === reviewId);

        if (index === -1) {
            return { success: false, message: 'Review not found' };
        }

        reviews[index].rating = parseInt(rating);
        reviews[index].reviewText = reviewText || '';
        reviews[index].updatedAt = new Date().toISOString();

        saveReviews(reviews);
        return { success: true, message: 'Review updated successfully!' };
    }

    // Delete a review
    function deleteReview(reviewId) {
        let reviews = getReviews();
        reviews = reviews.filter(r => r.id !== reviewId);
        saveReviews(reviews);
        return { success: true, message: 'Review deleted successfully!' };
    }

    // Mark review as helpful
    function markHelpful(reviewId) {
        const reviews = getReviews();
        const review = reviews.find(r => r.id === reviewId);
        
        if (review) {
            review.helpful = (review.helpful || 0) + 1;
            saveReviews(reviews);
            return { success: true, helpful: review.helpful };
        }

        return { success: false, message: 'Review not found' };
    }

    // Get member's reviews
    function getMemberReviews(memberId) {
        const reviews = getReviews();
        return reviews.filter(r => r.memberId === memberId);
    }

    // Get top-rated books
    function getTopRatedBooks(limit = 10) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        const booksWithRatings = books.map(book => {
            const rating = getBookRating(book.id);
            return {
                ...book,
                rating: rating
            };
        });

        // Sort by average rating (with minimum 3 reviews)
        return booksWithRatings
            .filter(b => b.rating.count >= 3)
            .sort((a, b) => {
                if (b.rating.average !== a.rating.average) {
                    return b.rating.average - a.rating.average;
                }
                return b.rating.count - a.rating.count;
            })
            .slice(0, limit);
    }

    // Render star rating HTML
    function renderStars(rating, size = 'medium') {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        const sizeClass = size === 'small' ? 'star-small' : size === 'large' ? 'star-large' : 'star-medium';

        let html = '<span class="stars-container ' + sizeClass + '">';
        
        for (let i = 0; i < fullStars; i++) {
            html += '<span class="star star-full">★</span>';
        }
        
        if (hasHalfStar) {
            html += '<span class="star star-half">★</span>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            html += '<span class="star star-empty">☆</span>';
        }
        
        html += '</span>';
        return html;
    }

    // Render rating summary
    function renderRatingSummary(bookId) {
        const rating = getBookRating(bookId);
        
        if (rating.count === 0) {
            return '<div class="rating-summary"><p class="no-reviews">No reviews yet. Be the first to review!</p></div>';
        }

        let html = '<div class="rating-summary">';
        html += '<div class="rating-overview">';
        html += '<div class="rating-score">' + rating.average + '</div>';
        html += '<div class="rating-stars">' + renderStars(parseFloat(rating.average), 'large') + '</div>';
        html += '<div class="rating-count">' + rating.count + ' review' + (rating.count !== 1 ? 's' : '') + '</div>';
        html += '</div>';

        html += '<div class="rating-breakdown">';
        for (let star = 5; star >= 1; star--) {
            const count = rating.stars[star];
            const percentage = rating.count > 0 ? (count / rating.count * 100).toFixed(0) : 0;
            
            html += '<div class="rating-bar-row">';
            html += '<span class="rating-bar-label">' + star + ' ★</span>';
            html += '<div class="rating-bar">';
            html += '<div class="rating-bar-fill" style="width: ' + percentage + '%"></div>';
            html += '</div>';
            html += '<span class="rating-bar-count">' + count + '</span>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';

        return html;
    }

    // Render review form
    function renderReviewForm(bookId, memberId, memberName) {
        if (!canReview(memberId, bookId)) {
            return '<div class="alert alert-info">You must borrow and return this book before you can review it.</div>';
        }

        if (hasReviewed(memberId, bookId)) {
            return '<div class="alert alert-warning">You have already reviewed this book.</div>';
        }

        let html = '<div class="review-form-container">';
        html += '<h4>Write a Review</h4>';
        html += '<form id="reviewForm" onsubmit="return false;">';
        
        html += '<div class="form-group">';
        html += '<label>Your Rating *</label>';
        html += '<div class="rating-input">';
        for (let i = 1; i <= 5; i++) {
            html += '<span class="rating-star" data-rating="' + i + '" onclick="selectRating(' + i + ')">☆</span>';
        }
        html += '</div>';
        html += '<input type="hidden" id="reviewRating" value="">';
        html += '</div>';

        html += '<div class="form-group">';
        html += '<label>Your Review</label>';
        html += '<textarea id="reviewText" rows="4" placeholder="Share your thoughts about this book..."></textarea>';
        html += '</div>';

        html += '<button type="button" class="btn btn-primary" onclick="submitBookReview(\'' + bookId + '\', \'' + memberId + '\', \'' + memberName + '\')">Submit Review</button>';
        html += '</form>';
        html += '</div>';

        return html;
    }

    // Render reviews list
    function renderReviewsList(bookId) {
        const reviews = getBookReviews(bookId);
        
        if (reviews.length === 0) {
            return '<div class="no-reviews-message">No reviews yet.</div>';
        }

        // Sort by date (newest first)
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let html = '<div class="reviews-list">';
        
        reviews.forEach(review => {
            const date = new Date(review.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });

            html += '<div class="review-item" data-review-id="' + review.id + '">';
            html += '<div class="review-header">';
            html += '<span class="review-author">' + review.memberName + '</span>';
            html += '<span class="review-date">' + formattedDate + '</span>';
            html += '</div>';
            html += '<div class="review-rating">' + renderStars(review.rating, 'small') + '</div>';
            
            if (review.reviewText) {
                html += '<div class="review-text">' + review.reviewText + '</div>';
            }
            
            html += '<div class="review-actions">';
            html += '<button class="btn-text" onclick="markReviewHelpful(\'' + review.id + '\')">👍 Helpful (' + (review.helpful || 0) + ')</button>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    // Public API
    window.ReviewsHelper = {
        getReviews: getReviews,
        getBookReviews: getBookReviews,
        getBookRating: getBookRating,
        canReview: canReview,
        hasReviewed: hasReviewed,
        submitReview: submitReview,
        updateReview: updateReview,
        deleteReview: deleteReview,
        markHelpful: markHelpful,
        getMemberReviews: getMemberReviews,
        getTopRatedBooks: getTopRatedBooks,
        renderStars: renderStars,
        renderRatingSummary: renderRatingSummary,
        renderReviewForm: renderReviewForm,
        renderReviewsList: renderReviewsList,
        addToBorrowedHistory: addToBorrowedHistory
    };

})();

// Advanced Search & Analytics Helper
(function() {
    'use strict';

    // Advanced search with multiple criteria
    function advancedSearch(criteria) {
        let books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        const {
            query = '',
            title = '',
            author = '',
            isbn = '',
            publisher = '',
            category = '',
            yearFrom = '',
            yearTo = '',
            minRating = 0,
            availability = 'all',
            sortBy = 'relevance'
        } = criteria;

        // Apply filters
        if (query) {
            const q = query.toLowerCase();
            books = books.filter(book => 
                book.title.toLowerCase().includes(q) ||
                book.author.toLowerCase().includes(q) ||
                (book.isbn && book.isbn.toLowerCase().includes(q)) ||
                (book.publisher && book.publisher.toLowerCase().includes(q)) ||
                book.category.toLowerCase().includes(q) ||
                (book.description && book.description.toLowerCase().includes(q))
            );
        }

        if (title) {
            books = books.filter(book => 
                book.title.toLowerCase().includes(title.toLowerCase())
            );
        }

        if (author) {
            books = books.filter(book => 
                book.author.toLowerCase().includes(author.toLowerCase())
            );
        }

        if (isbn) {
            books = books.filter(book => 
                book.isbn && book.isbn.replace(/[- ]/g, '').includes(isbn.replace(/[- ]/g, ''))
            );
        }

        if (publisher) {
            books = books.filter(book => 
                book.publisher && book.publisher.toLowerCase().includes(publisher.toLowerCase())
            );
        }

        if (category) {
            books = books.filter(book => book.category === category);
        }

        if (yearFrom) {
            books = books.filter(book => {
                const bookYear = book.publicationYear || extractYear(book.publishedDate);
                return bookYear >= parseInt(yearFrom);
            });
        }

        if (yearTo) {
            books = books.filter(book => {
                const bookYear = book.publicationYear || extractYear(book.publishedDate);
                return bookYear <= parseInt(yearTo);
            });
        }

        if (availability === 'available') {
            books = books.filter(book => book.availableCopies > 0);
        } else if (availability === 'outofstock') {
            books = books.filter(book => book.availableCopies === 0);
        }

        // Add ratings if ReviewsHelper is available
        if (window.ReviewsHelper) {
            books = books.map(book => ({
                ...book,
                rating: ReviewsHelper.getBookRating(book.id)
            }));

            if (minRating > 0) {
                books = books.filter(book => 
                    parseFloat(book.rating.average) >= minRating
                );
            }
        }

        // Sort results
        books = sortBooks(books, sortBy);

        return books;
    }

    // Extract year from date string
    function extractYear(dateString) {
        if (!dateString) return 0;
        const match = dateString.match(/\d{4}/);
        return match ? parseInt(match[0]) : 0;
    }

    // Sort books by various criteria
    function sortBooks(books, sortBy) {
        const sortFunctions = {
            'relevance': (a, b) => 0, // Keep current order
            'title-asc': (a, b) => a.title.localeCompare(b.title),
            'title-desc': (a, b) => b.title.localeCompare(a.title),
            'author-asc': (a, b) => a.author.localeCompare(b.author),
            'author-desc': (a, b) => b.author.localeCompare(a.author),
            'year-asc': (a, b) => {
                const yearA = a.publicationYear || extractYear(a.publishedDate) || 0;
                const yearB = b.publicationYear || extractYear(b.publishedDate) || 0;
                return yearA - yearB;
            },
            'year-desc': (a, b) => {
                const yearA = a.publicationYear || extractYear(a.publishedDate) || 0;
                const yearB = b.publicationYear || extractYear(b.publishedDate) || 0;
                return yearB - yearA;
            },
            'rating-desc': (a, b) => {
                const ratingA = a.rating ? parseFloat(a.rating.average) : 0;
                const ratingB = b.rating ? parseFloat(b.rating.average) : 0;
                if (ratingB !== ratingA) return ratingB - ratingA;
                return (b.rating?.count || 0) - (a.rating?.count || 0);
            },
            'popular': (a, b) => {
                const countA = a.rating ? a.rating.count : 0;
                const countB = b.rating ? b.rating.count : 0;
                return countB - countA;
            },
            'available-desc': (a, b) => b.availableCopies - a.availableCopies
        };

        const sortFn = sortFunctions[sortBy] || sortFunctions['relevance'];
        return books.sort(sortFn);
    }

    // Get search suggestions based on partial input
    function getSearchSuggestions(query, limit = 10) {
        if (!query || query.length < 2) return [];

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const q = query.toLowerCase();
        const suggestions = new Set();

        books.forEach(book => {
            if (book.title.toLowerCase().includes(q)) {
                suggestions.add({ type: 'title', text: book.title, bookId: book.id });
            }
            if (book.author.toLowerCase().includes(q)) {
                suggestions.add({ type: 'author', text: book.author, bookId: book.id });
            }
            if (book.category.toLowerCase().includes(q)) {
                suggestions.add({ type: 'category', text: book.category });
            }
        });

        return Array.from(suggestions).slice(0, limit);
    }

    // Get popular searches (based on borrowed books)
    function getPopularSearches(limit = 10) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const bookCounts = {};

        issues.forEach(issue => {
            bookCounts[issue.bookId] = (bookCounts[issue.bookId] || 0) + 1;
        });

        const sortedBookIds = Object.entries(bookCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        return sortedBookIds.map(bookId => 
            books.find(b => b.id === bookId)
        ).filter(Boolean);
    }

    // Get recently added books
    function getRecentlyAddedBooks(limit = 10) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        return books
            .sort((a, b) => {
                const dateA = new Date(a.addedDate || 0);
                const dateB = new Date(b.addedDate || 0);
                return dateB - dateA;
            })
            .slice(0, limit);
    }

    // Get trending books (borrowed in last 30 days)
    function getTrendingBooks(limit = 10) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const recentIssues = issues.filter(issue => {
            const issueDate = new Date(issue.issueDate);
            return issueDate >= thirtyDaysAgo;
        });

        const bookCounts = {};
        recentIssues.forEach(issue => {
            bookCounts[issue.bookId] = (bookCounts[issue.bookId] || 0) + 1;
        });

        const sortedBookIds = Object.entries(bookCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);

        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        return sortedBookIds.map(bookId => {
            const book = books.find(b => b.id === bookId);
            if (book && window.ReviewsHelper) {
                return {
                    ...book,
                    borrowCount: bookCounts[bookId],
                    rating: ReviewsHelper.getBookRating(bookId)
                };
            }
            return book;
        }).filter(Boolean);
    }

    // Get book recommendations based on member's history
    function getRecommendations(memberId, limit = 10) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);

        // Get books borrowed by this member
        const memberBorrowedBooks = issues
            .filter(issue => issue.memberId === memberId)
            .map(issue => books.find(b => b.id === issue.bookId))
            .filter(Boolean);

        if (memberBorrowedBooks.length === 0) {
            // Return trending books if no history
            return getTrendingBooks(limit);
        }

        // Get categories and authors the member likes
        const likedCategories = {};
        const likedAuthors = {};

        memberBorrowedBooks.forEach(book => {
            likedCategories[book.category] = (likedCategories[book.category] || 0) + 1;
            likedAuthors[book.author] = (likedAuthors[book.author] || 0) + 1;
        });

        // Score all books
        const recommendations = books
            .filter(book => !memberBorrowedBooks.some(b => b.id === book.id))
            .map(book => {
                let score = 0;
                
                // Category match
                if (likedCategories[book.category]) {
                    score += likedCategories[book.category] * 3;
                }
                
                // Author match
                if (likedAuthors[book.author]) {
                    score += likedAuthors[book.author] * 2;
                }

                // Rating boost
                if (window.ReviewsHelper) {
                    const rating = ReviewsHelper.getBookRating(book.id);
                    score += parseFloat(rating.average) * 0.5;
                }

                // Availability boost
                if (book.availableCopies > 0) {
                    score += 1;
                }

                return { ...book, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return recommendations;
    }

    // Get books by same author
    function getBooksByAuthor(authorName, excludeBookId = null, limit = 10) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        return books
            .filter(book => 
                book.author.toLowerCase() === authorName.toLowerCase() &&
                book.id !== excludeBookId
            )
            .slice(0, limit);
    }

    // Get books in same category
    function getBooksInCategory(category, excludeBookId = null, limit = 10) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        return books
            .filter(book => 
                book.category === category &&
                book.id !== excludeBookId
            )
            .slice(0, limit);
    }

    // Search history tracking
    const SEARCH_HISTORY_KEY = 'lib_search_history';
    const MAX_SEARCH_HISTORY = 20;

    function saveSearchQuery(query) {
        if (!query || query.trim().length < 2) return;

        let history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
        
        // Remove duplicates
        history = history.filter(item => item.query !== query);
        
        // Add new query at the beginning
        history.unshift({
            query: query,
            timestamp: new Date().toISOString()
        });

        // Limit history size
        if (history.length > MAX_SEARCH_HISTORY) {
            history = history.slice(0, MAX_SEARCH_HISTORY);
        }

        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    }

    function getSearchHistory(limit = 10) {
        const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
        return history.slice(0, limit);
    }

    function clearSearchHistory() {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
    }

    // Public API
    window.AdvancedSearchHelper = {
        advancedSearch: advancedSearch,
        sortBooks: sortBooks,
        getSearchSuggestions: getSearchSuggestions,
        getPopularSearches: getPopularSearches,
        getRecentlyAddedBooks: getRecentlyAddedBooks,
        getTrendingBooks: getTrendingBooks,
        getRecommendations: getRecommendations,
        getBooksByAuthor: getBooksByAuthor,
        getBooksInCategory: getBooksInCategory,
        saveSearchQuery: saveSearchQuery,
        getSearchHistory: getSearchHistory,
        clearSearchHistory: clearSearchHistory
    };

})();

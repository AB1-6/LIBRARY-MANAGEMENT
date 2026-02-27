// Reading Statistics & Analytics Helper
(function() {
    'use strict';

    // Get member's reading statistics
    function getMemberStats(memberId) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        const memberIssues = issues.filter(issue => issue.memberId === memberId);
        const activeIssues = memberIssues.filter(issue => issue.status !== 'returned');
        const returnedIssues = memberIssues.filter(issue => issue.status === 'returned');
        
        return {
            totalBorrowed: memberIssues.length,
            currentlyBorrowed: activeIssues.length,
            totalReturned: returnedIssues.length,
            onTimeReturns: calculateOnTimeReturns(returnedIssues),
            totalFinesPaid: calculateTotalFines(returnedIssues),
            outstandingFines: calculateOutstandingFines(activeIssues),
            favoriteGenres: calculateFavoriteGenres(memberIssues, books),
            favoriteAuthors: calculateFavoriteAuthors(memberIssues, books),
            readingStreak: calculateReadingStreak(memberIssues),
            booksPerMonth: calculateBooksPerMonth(memberIssues),
            averageBorrowDuration: calculateAverageDuration(returnedIssues),
            mostBorrowedBooks: getMostBorrowedBooks(memberIssues, books)
        };
    }

    // Calculate on-time return percentage
    function calculateOnTimeReturns(returnedIssues) {
        if (returnedIssues.length === 0) return { count: 0, percentage: 0 };
        
        let onTimeCount = 0;
        returnedIssues.forEach(issue => {
            if (issue.returnDate && issue.dueDate) {
                const returnDate = new Date(issue.returnDate);
                const dueDate = new Date(issue.dueDate);
                if (returnDate <= dueDate) {
                    onTimeCount++;
                }
            }
        });
        
        return {
            count: onTimeCount,
            total: returnedIssues.length,
            percentage: Math.round((onTimeCount / returnedIssues.length) * 100)
        };
    }

    // Calculate total fines paid
    function calculateTotalFines(returnedIssues) {
        return returnedIssues.reduce((sum, issue) => sum + (issue.fine || 0), 0);
    }

    // Calculate outstanding fines for active books
    function calculateOutstandingFines(activeIssues) {
        const today = new Date();
        let totalFines = 0;
        
        activeIssues.forEach(issue => {
            const dueDate = new Date(issue.dueDate);
            const daysOverdue = Math.max(0, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)));
            totalFines += daysOverdue * 1; // $1 per day
        });
        
        return totalFines;
    }

    // Calculate favorite genres
    function calculateFavoriteGenres(memberIssues, books) {
        const genreCounts = {};
        
        memberIssues.forEach(issue => {
            const book = books.find(b => b.id === issue.bookId);
            if (book && book.category) {
                genreCounts[book.category] = (genreCounts[book.category] || 0) + 1;
            }
        });
        
        return Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre, count]) => ({ genre, count }));
    }

    // Calculate favorite authors
    function calculateFavoriteAuthors(memberIssues, books) {
        const authorCounts = {};
        
        memberIssues.forEach(issue => {
            const book = books.find(b => b.id === issue.bookId);
            if (book && book.author) {
                authorCounts[book.author] = (authorCounts[book.author] || 0) + 1;
            }
        });
        
        return Object.entries(authorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([author, count]) => ({ author, count }));
    }

    // Calculate reading streak (consecutive months with at least 1 book)
    function calculateReadingStreak(memberIssues) {
        if (memberIssues.length === 0) return { current: 0, longest: 0 };
        
        const issuesByMonth = {};
        memberIssues.forEach(issue => {
            const date = new Date(issue.issueDate);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            issuesByMonth[monthKey] = true;
        });
        
        const months = Object.keys(issuesByMonth).sort().reverse();
        
        // Calculate current streak
        let currentStreak = 0;
        const today = new Date();
        let checkDate = new Date(today.getFullYear(), today.getMonth(), 1);
        
        while (true) {
            const monthKey = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0');
            if (issuesByMonth[monthKey]) {
                currentStreak++;
                checkDate.setMonth(checkDate.getMonth() - 1);
            } else {
                break;
            }
        }
        
        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        
        for (let i = 0; i < months.length; i++) {
            if (i === 0 || isConsecutiveMonth(months[i], months[i - 1])) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
        }
        
        return { current: currentStreak, longest: longestStreak };
    }

    // Check if two month strings are consecutive
    function isConsecutiveMonth(month1, month2) {
        const [y1, m1] = month1.split('-').map(Number);
        const [y2, m2] = month2.split('-').map(Number);
        
        const date1 = new Date(y1, m1 - 1);
        const date2 = new Date(y2, m2 - 1);
        
        const diffMonths = (date2.getFullYear() - date1.getFullYear()) * 12 + 
                          (date2.getMonth() - date1.getMonth());
        
        return diffMonths === 1;
    }

    // Calculate books borrowed per month (last 12 months)
    function calculateBooksPerMonth(memberIssues) {
        const monthCounts = {};
        const today = new Date();
        
        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthCounts[monthKey] = { label: monthLabel, count: 0 };
        }
        
        // Count issues per month
        memberIssues.forEach(issue => {
            const date = new Date(issue.issueDate);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            if (monthCounts[monthKey]) {
                monthCounts[monthKey].count++;
            }
        });
        
        return Object.values(monthCounts);
    }

    // Calculate average borrow duration (in days)
    function calculateAverageDuration(returnedIssues) {
        if (returnedIssues.length === 0) return 0;
        
        let totalDays = 0;
        let count = 0;
        
        returnedIssues.forEach(issue => {
            if (issue.issueDate && issue.returnDate) {
                const issueDate = new Date(issue.issueDate);
                const returnDate = new Date(issue.returnDate);
                const days = Math.ceil((returnDate - issueDate) / (1000 * 60 * 60 * 24));
                if (days > 0) {
                    totalDays += days;
                    count++;
                }
            }
        });
        
        return count > 0 ? Math.round(totalDays / count) : 0;
    }

    // Get most borrowed books by member
    function getMostBorrowedBooks(memberIssues, books) {
        const bookCounts = {};
        
        memberIssues.forEach(issue => {
            bookCounts[issue.bookId] = (bookCounts[issue.bookId] || 0) + 1;
        });
        
        return Object.entries(bookCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([bookId, count]) => {
                const book = books.find(b => b.id === bookId);
                return {
                    bookId,
                    title: book ? book.title : 'Unknown',
                    author: book ? book.author : 'Unknown',
                    count
                };
            });
    }

    // Get library-wide statistics (for admin/librarian)
    function getLibraryStats() {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const categories = LibraryStore.load(LibraryStore.KEYS.categories, []);
        
        const activeIssues = issues.filter(issue => issue.status !== 'returned');
        const returnedIssues = issues.filter(issue => issue.status === 'returned');
        const today = new Date();
        
        // Calculate overdue issues
        const overdueIssues = activeIssues.filter(issue => {
            const dueDate = new Date(issue.dueDate);
            return dueDate < today;
        });
        
        // Calculate due today
        const dueTodayIssues = activeIssues.filter(issue => {
            const dueDate = new Date(issue.dueDate);
            return dueDate.toDateString() === today.toDateString();
        });
        
        // Books by category
        const booksByCategory = categories.map(cat => ({
            category: cat.name,
            count: books.filter(b => b.category === cat.name).length
        }));
        
        // Most popular books
        const bookBorrowCounts = {};
        issues.forEach(issue => {
            bookBorrowCounts[issue.bookId] = (bookBorrowCounts[issue.bookId] || 0) + 1;
        });
        
        const popularBooks = Object.entries(bookBorrowCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([bookId, count]) => {
                const book = books.find(b => b.id === bookId);
                return {
                    bookId,
                    title: book ? book.title : 'Unknown',
                    author: book ? book.author : 'Unknown',
                    borrowCount: count
                };
            });
        
        // Most active members
        const memberBorrowCounts = {};
        issues.forEach(issue => {
            memberBorrowCounts[issue.memberId] = (memberBorrowCounts[issue.memberId] || 0) + 1;
        });
        
        const activeMembers = Object.entries(memberBorrowCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([memberId, count]) => {
                const member = members.find(m => m.id === memberId);
                return {
                    memberId,
                    name: member ? member.name : 'Unknown',
                    email: member ? member.email : 'Unknown',
                    borrowCount: count
                };
            });
        
        // Monthly trends (last 12 months)
        const monthlyIssues = calculateMonthlyTrend(issues);
        const monthlyReturns = calculateMonthlyTrend(returnedIssues);
        
        // Calculate collection utilization
        const totalBooks = books.reduce((sum, book) => sum + book.totalCopies, 0);
        const availableBooks = books.reduce((sum, book) => sum + book.availableCopies, 0);
        const utilization = totalBooks > 0 ? Math.round(((totalBooks - availableBooks) / totalBooks) * 100) : 0;
        
        return {
            totalBooks: books.length,
            totalCopies: totalBooks,
            totalMembers: members.length,
            totalCategories: categories.length,
            activeIssues: activeIssues.length,
            totalIssues: issues.length,
            overdueIssues: overdueIssues.length,
            dueTodayIssues: dueTodayIssues.length,
            collectionUtilization: utilization,
            booksByCategory,
            popularBooks,
            activeMembers,
            monthlyIssues,
            monthlyReturns
        };
    }

    // Calculate monthly trend
    function calculateMonthlyTrend(issues) {
        const monthCounts = {};
        const today = new Date();
        
        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthCounts[monthKey] = { label: monthLabel, count: 0 };
        }
        
        // Count issues per month
        issues.forEach(issue => {
            const date = new Date(issue.issueDate);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            if (monthCounts[monthKey]) {
                monthCounts[monthKey].count++;
            }
        });
        
        return Object.values(monthCounts);
    }

    // Render statistics card
    function renderStatsCard(title, stats) {
        let html = '<div class="stats-card">';
        html += '<h3>' + title + '</h3>';
        html += '<div class="stats-grid">';
        
        Object.entries(stats).forEach(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
            
            html += '<div class="stat-item">';
            html += '<div class="stat-label">' + displayLabel + '</div>';
            html += '<div class="stat-value">' + value + '</div>';
            html += '</div>';
        });
        
        html += '</div>';
        html += '</div>';
        
        return html;
    }

    // Public API
    window.AnalyticsHelper = {
        getMemberStats: getMemberStats,
        getLibraryStats: getLibraryStats,
        renderStatsCard: renderStatsCard
    };

})();

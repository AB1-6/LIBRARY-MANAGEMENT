// Bulk Operations & Export Helper
(function() {
    'use strict';

    // Export to CSV
    function exportToCSV(data, filename, columns) {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        // Build CSV content
        let csvContent = '';

        // Header row
        if (columns) {
            csvContent += columns.map(col => escapeCSVValue(col.label || col.key)).join(',') + '\\n';
        } else {
            // Auto-detect columns from first object
            const keys = Object.keys(data[0]);
            csvContent += keys.join(',') + '\\n';
            columns = keys.map(key => ({ key: key }));
        }

        // Data rows
        data.forEach(row => {
            const values = columns.map(col => {
                const value = col.key.includes('.') 
                    ? getNestedValue(row, col.key)
                    : row[col.key];
                return escapeCSVValue(value);
            });
            csvContent += values.join(',') + '\\n';
        });

        // Download file
        downloadFile(csvContent, filename + '.csv', 'text/csv');
    }

    // Escape CSV values
    function escapeCSVValue(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
    }

    // Get nested value from object
    function getNestedValue(obj, path) {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) break;
        }
        return value;
    }

    // Export to JSON
    function exportToJSON(data, filename) {
        if (!data) {
            alert('No data to export');
            return;
        }

        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, filename + '.json', 'application/json');
    }

    // Download file helper
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Export books list
    function exportBooks() {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        const columns = [
            { key: 'id', label: 'Book ID' },
            { key: 'title', label: 'Title' },
            { key: 'author', label: 'Author' },
            { key: 'category', label: 'Category' },
            { key: 'isbn', label: 'ISBN' },
            { key: 'publisher', label: 'Publisher' },
            { key: 'publishedDate', label: 'Published Date' },
            { key: 'totalCopies', label: 'Total Copies' },
            { key: 'availableCopies', label: 'Available Copies' }
        ];

        exportToCSV(books, 'books_export_' + getDateString(), columns);
    }

    // Export members list
    function exportMembers() {
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        
        const columns = [
            { key: 'id', label: 'member ID' },
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'type', label: 'Type' },
            { key: 'memberSince', label: 'Member Since' }
        ];

        exportToCSV(members, 'members_export_'+ getDateString(), columns);
    }

    // Export issues/transactions
    function exportIssues(status = 'all') {
        let issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);

        // Filter by status
        if (status !== 'all') {
            issues = issues.filter(i => i.status === status);
        }

        // Enrich data with book and member info
        const enrichedIssues = issues.map(issue => {
            const book = books.find(b => b.id === issue.bookId);
            const member = members.find(m => m.id === issue.memberId);

            return {
                issueId: issue.id,
                bookId: issue.bookId,
                bookTitle: book ? book.title : 'Unknown',
                bookAuthor: book ? book.author : 'Unknown',
                memberId: issue.memberId,
                memberName: member ? member.name : 'Unknown',
                memberEmail: member ? member.email : 'Unknown',
                issueDate: issue.issueDate,
                dueDate: issue.dueDate,
                returnDate: issue.returnDate || '',
                status: issue.status,
                fine: issue.fine || 0,
                daysOverdue: issue.daysOverdue || 0
            };
        });

        const columns = [
            { key: 'issueId', label: 'Issue ID' },
            { key: 'bookId', label: 'Book ID' },
            { key: 'bookTitle', label: 'Book Title' },
            { key: 'bookAuthor', label: 'Author' },
            { key: 'memberId', label: 'Member ID' },
            { key: 'memberName', label: 'Member Name' },
            { key: 'memberEmail', label: 'Member Email' },
            { key: 'issueDate', label: 'Issue Date' },
            { key: 'dueDate', label: 'Due Date' },
            { key: 'returnDate', label: 'Return Date' },
            { key: 'status', label: 'Status' },
            { key: 'fine', label: 'Fine' },
            { key: 'daysOverdue', label: 'Days Overdue' }
        ];

        const filename = 'issues_' + (status !== 'all' ? status + '_' : '') + getDateString();
        exportToCSV(enrichedIssues, filename, columns);
    }

    // Export overdue report
    function exportOverdueReport() {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const today = new Date();

        const overdueIssues = issues.filter(issue => {
            if (issue.status === 'returned') return false;
            const dueDate = new Date(issue.dueDate);
            return dueDate < today;
        });

        const reportData = overdueIssues.map(issue => {
            const book = books.find(b => b.id === issue.bookId);
            const member = members.find(m => m.id === issue.memberId);
            const fine = window.FineHelper ? FineHelper.calculateFine(issue) : 0;
            const daysOverdue = Math.ceil((today - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));

            return {
                issueId: issue.id,
                memberName: member ? member.name : 'Unknown',
                memberEmail: member ? member.email : 'Unknown',
                memberPhone: member ? member.phone : 'Unknown',
                bookTitle: book ? book.title : 'Unknown',
                bookAuthor: book ? book.author : 'Unknown',
                issueDate: new Date(issue.issueDate).toLocaleDateString(),
                dueDate: new Date(issue.dueDate).toLocaleDateString(),
                daysOverdue: daysOverdue,
                fine: fine
            };
        });

        const columns = [
            { key: 'issueId', label: 'Issue ID' },
            { key: 'memberName', label: 'Member Name' },
            { key: 'memberEmail', label: 'Email' },
            { key: 'memberPhone', label: 'Phone' },
            { key: 'bookTitle', label: 'Book Title' },
            { key: 'bookAuthor', label: 'Author' },
            { key: 'issueDate', label: 'Issue Date' },
            { key: 'dueDate', label: 'Due Date' },
            { key: 'daysOverdue', label: 'Days Overdue' },
            { key: 'fine', label: 'Fine Amount' }
        ];

        exportToCSV(reportData, 'overdue_report_' + getDateString(), columns);
    }

    // Export fine report
    function exportFineReport() {
        if (!window.FineHelper) {
            alert('Fine helper not loaded');
            return;
        }

        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const membersWithFines = FineHelper.getMembersWithFines();

        const reportData = membersWithFines.map(item => {
            const member = members.find(m => m.id === item.memberId);
            const fineInfo = FineHelper.getMemberFines(item.memberId);

            return {
                memberId: item.memberId,
                memberName: item.memberName,
                memberEmail: item.memberEmail,
                memberPhone: member ? member.phone : 'Unknown',
                totalOutstanding: fineInfo.totalOutstanding,
                totalPaid: fineInfo.totalPaid,
                activeIssuesCount: fineInfo.activeFines.length
            };
        });

        const columns = [
            { key: 'memberId', label: 'Member ID' },
            { key: 'memberName', label: 'Member Name' },
            { key: 'memberEmail', label: 'Email' },
            { key: 'memberPhone', label: 'Phone' },
            { key: 'totalOutstanding', label: 'Outstanding Fines' },
            { key: 'totalPaid', label: 'Total Paid' },
            { key: 'activeIssuesCount', label: 'Overdue Books' }
        ];

        exportToCSV(reportData, 'fines_report_' + getDateString(), columns);
    }

    // Export full library report
    function exportFullReport() {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const categories = LibraryStore.load(LibraryStore.KEYS.categories, []);

        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalBooks: books.length,
                totalMembers: members.length,
                totalIssues: issues.length,
                activeIssues: issues.filter(i => i.status !== 'returned').length,
                totalCategories: categories.length
            },
            books: books,
            members: members,
            issues: issues,
            categories: categories
        };

        exportToJSON(report, 'full_library_report_' +getDateString());
    }

    // Bulk update book copies
    function bulkUpdateBookCopies(updates) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        let updatedCount = 0;

        updates.forEach(update => {
            const book = books.find(b => b.id === update.bookId);
            if (book) {
                if (update.totalCopies !== undefined) {
                    const difference = update.totalCopies - book.totalCopies;
                    book.totalCopies = update.totalCopies;
                    book.availableCopies += difference;
                }
                if (update.availableCopies !== undefined) {
                    book.availableCopies = Math.max(0, Math.min(update.availableCopies, book.totalCopies));
                }
                updatedCount++;
            }
        });

        LibraryStore.save(LibraryStore.KEYS.books, books);
        
        return { success: true, message: updatedCount + ' books updated' };
    }

    // Bulk delete books
    function bulkDeleteBooks(bookIds) {
        let books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const initialCount = books.length;

        books = books.filter(book => !bookIds.includes(book.id));
        
        LibraryStore.save(LibraryStore.KEYS.books, books);

        const deletedCount = initialCount - books.length;
        return { success: true, message: deletedCount + ' books deleted' };
    }

    // Bulk send reminders
    function bulkSendReminders(memberIds, message) {
        if (!window.NotificationHelper) {
            return { success: false, message: 'Notification helper not loaded' };
        }

        let sentCount = 0;

        memberIds.forEach(memberId => {
            NotificationHelper.createNotification(
                memberId,
                'reminder',
                'Library Reminder',
                message,
                { sentBy: 'admin', sentAt: new Date().toISOString() }
            );
            sentCount++;
        });

        return { success: true, message: sentCount + ' reminders sent' };
    }

    // Get date string for filenames
    function getDateString() {
        const now = new Date();
        return now.getFullYear() + 
               String(now.getMonth() + 1).padStart(2, '0') + 
               String(now.getDate()).padStart(2, '0');
    }

    // Print member cards (batch)
    function printMemberCards(memberIds) {
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        
        const selectedMembers = members.filter(m => memberIds.includes(m.id));
        
        if (selectedMembers.length === 0) {
            alert('No members selected');
            return;
        }

        // Create print window
        const printWindow = window.open('', '_blank');
        
        let html = '<html><head><title>Member Cards</title>';
        html += '<style>';
        html += 'body { font-family: Arial, sans-serif; }';
        html += '.member-card { width: 85mm; height: 54mm; border: 1px solid #ddd; padding: 10px; margin: 10px; page-break-after: always; display: inline-block; }';
        html += '.member-card h3 { margin: 0 0 10px 0; }';
        html += '.member-card p { margin: 5px 0; font-size: 14px; }';
        html += '.member-card .qr-code { margin-top: 10px; }';
        html += '@media print { .member-card { margin: 0; } }';
        html += '</style></head><body>';

        selectedMembers.forEach(member => {
            html += '<div class="member-card">';
            html += '<h3>Library Member Card</h3>';
            html += '<p><strong>Name:</strong> ' + member.name + '</p>';
            html += '<p><strong>ID:</strong> ' + member.id + '</p>';
            html += '<p><strong>Email:</strong> ' + member.email + '</p>';
            html += '<p><strong>Type:</strong> ' + (member.type || 'Student') + '</p>';
            html += '<div class="qr-code" id="qr-' + member.id + '"></div>';
            html += '</div>';
        });

        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Generate QR codes after window loads
        printWindow.onload = function() {
            selectedMembers.forEach(member => {
                if (window.QRCodeHelper) {
                    // Generate QR code for each member
                    const container = printWindow.document.getElementById('qr-' + member.id);
                    if (container) {
                        // Add QR code generation here if QRCode library is available
                    }
                }
            });
            
            setTimeout(() => printWindow.print(), 500);
        };
    }

    // Public API
    window.BulkOpsHelper = {
        exportToCSV: exportToCSV,
        exportToJSON: exportToJSON,
        exportBooks: exportBooks,
        exportMembers: exportMembers,
        exportIssues: exportIssues,
        exportOverdueReport: exportOverdueReport,
        exportFineReport: exportFineReport,
        exportFullReport: exportFullReport,
        bulkUpdateBookCopies: bulkUpdateBookCopies,
        bulkDeleteBooks: bulkDeleteBooks,
        bulkSendReminders: bulkSendReminders,
        printMemberCards: printMemberCards
    };

})();

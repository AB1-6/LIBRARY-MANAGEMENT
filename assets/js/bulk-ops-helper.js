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
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Library Member Cards</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', 'Segoe UI', sans-serif;
            background: #f5f5f5;
            padding: 20px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
            align-items: flex-start;
        }

        .cards-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 30px;
            padding: 20px;
        }

        .member-card {
            width: 350px;
            height: auto;
            background: linear-gradient(135deg, #A47148 0%, #8B5E3C 100%);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            position: relative;
            overflow: hidden;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .member-card::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 300px;
            height: 300px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 50%;
            pointer-events: none;
        }

        .member-card::after {
            content: '';
            position: absolute;
            bottom: -50px;
            left: -50px;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 50%;
            pointer-events: none;
        }

        .card-content {
            position: relative;
            z-index: 1;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .card-header {
            text-align: center;
            margin-bottom: 25px;
            width: 100%;
        }

        .card-title {
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .card-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 300;
            letter-spacing: 0.5px;
        }

        .profile-section {
            text-align: center;
            margin-bottom: 25px;
            width: 100%;
        }

        .profile-image-container {
            width: 100px;
            height: 100px;
            margin: 0 auto 15px;
            border: 4px solid #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .profile-image-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .profile-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #8B5E3C, #A47148);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: #fff;
        }

        .member-name {
            font-size: 20px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 5px;
        }

        .member-status {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.15);
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-block;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .details-section {
            width: 100%;
            background: rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .detail-value {
            font-size: 13px;
            color: #fff;
            font-weight: 600;
            text-align: right;
            flex: 1;
            margin-left: 10px;
        }

        .qr-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .qr-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 8px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .qr-code {
            width: 100%;
            max-width: 120px;
            height: auto;
            background: #fff;
            padding: 8px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Print Optimization */
        @media print {
            body {
                background: #fff;
                padding: 0;
            }

            .cards-container {
                gap: 0;
                padding: 0;
            }

            .member-card {
                width: 8.5in;
                height: auto;
                box-shadow: none;
                background: linear-gradient(135deg, #A47148 0%, #8B5E3C 100%);
                margin: 0;
                page-break-after: always;
                border-radius: 0;
            }

            .member-card::before,
            .member-card::after {
                display: none;
            }

            @page {
                margin: 0;
                size: 8.5in auto;
            }
        }

        /* Responsiveness */
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }

            .member-card {
                width: 100%;
                max-width: 350px;
            }

            .card-title {
                font-size: 16px;
            }

            .member-name {
                font-size: 18px;
            }

            .detail-label {
                font-size: 10px;
            }

            .detail-value {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="cards-container">`;

        selectedMembers.forEach(member => {
            const memberType = member.type || 'Student';
            const initials = member.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
            const profileImg = member.profilePhoto ? `<img src="${member.profilePhoto}" alt="${member.name}">` : 
                               `<div class="profile-placeholder">${initials}</div>`;

            html += `
        <div class="member-card">
            <div class="card-content">
                <div class="card-header">
                    <div class="card-title">LIBRARY MEMBER CARD</div>
                    <div class="card-subtitle">Library Management System</div>
                </div>

                <div class="profile-section">
                    <div class="profile-image-container">
                        ${profileImg}
                    </div>
                    <div class="member-name">${member.name || 'N/A'}</div>
                    <div class="member-status">${memberType}</div>
                </div>

                <div class="details-section">
                    <div class="detail-row">
                        <span class="detail-label">Member ID</span>
                        <span class="detail-value">${member.id || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${member.email || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${member.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Joined</span>
                        <span class="detail-value">${member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>

                <div class="qr-section">
                    <div class="qr-label">Member Identification</div>
                    <div class="qr-code" id="qr-${member.id}"></div>
                </div>
            </div>
        </div>`;
        });

        html += `
    </div>
</body>
</html>`;
        
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Generate QR codes after window loads
        printWindow.onload = function() {
            selectedMembers.forEach(member => {
                const container = printWindow.document.getElementById('qr-' + member.id);
                if (container && window.QRCode) {
                    try {
                        new window.QRCode(container, {
                            text: member.id,
                            width: 100,
                            height: 100,
                            correctLevel: window.QRCode.CorrectLevel.H,
                            colorDark: "#8B5E3C",
                            colorLight: "#ffffff"
                        });
                    } catch (e) {
                        container.innerHTML = '<div style="font-size: 10px; color: #666;">QR Code</div>';
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

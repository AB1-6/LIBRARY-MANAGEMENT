// Fine Calculator & Management Helper
(function() {
    'use strict';

    const FINES_KEY = 'lib_fines';
    const FINE_RATE_PER_DAY = 1; // $1 per day
    const MAX_FINE_PER_BOOK = 50; // Maximum fine per book

    // Get all fines from localStorage
    function getAllFines() {
        return LibraryStore.load(FINES_KEY, []);
    }

    // Save fines to localStorage
    function saveFines(fines) {
        LibraryStore.save(FINES_KEY, fines);
    }

    // Calculate fine for a single issue
    function calculateFine(issue) {
        if (!issue || issue.status === 'returned') {
            return issue.fine || 0; // Return recorded fine if already returned
        }

        const dueDate = new Date(issue.dueDate);
        const today = new Date();
        
        // Set time to start of day for accurate day calculation
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const daysOverdue = Math.max(0, Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)));
        
        if (daysOverdue === 0) return 0;
        
        const fine = Math.min(daysOverdue * FINE_RATE_PER_DAY, MAX_FINE_PER_BOOK);
        
        return fine;
    }

    // Get all fines for a member
    function getMemberFines(memberId) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        const memberIssues = issues.filter(issue => issue.memberId === memberId);
        const activeIssues = memberIssues.filter(issue => issue.status !== 'returned');
        const returnedIssues = memberIssues.filter(issue => issue.status === 'returned');
        
        let totalOutstanding = 0;
        let totalPaid = 0;
        const activeFines = [];
        
        // Calculate fines for active issues
        activeIssues.forEach(issue => {
            const fine = calculateFine(issue);
            if (fine > 0) {
                const book = books.find(b => b.id === issue.bookId);
                const daysOverdue = Math.ceil((new Date() - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24));
                
                activeFines.push({
                    issueId: issue.id,
                    bookId: issue.bookId,
                    bookTitle: book ? book.title : 'Unknown',
                    issueDate: issue.issueDate,
                    dueDate: issue.dueDate,
                    daysOverdue: daysOverdue,
                    fine: fine,
                    status: 'outstanding'
                });
                
                totalOutstanding += fine;
            }
        });
        
        // Sum up paid fines from returned books
        returnedIssues.forEach(issue => {
            if (issue.fine && issue.fine > 0) {
                totalPaid += issue.fine;
            }
        });
        
        return {
            memberId: memberId,
            totalOutstanding: totalOutstanding,
            totalPaid: totalPaid,
            totalAllTime: totalOutstanding + totalPaid,
            activeFines: activeFines,
            fineHistory: getFineHistory(memberId)
        };
    }

    // Get fine history for a member
    function getFineHistory(memberId) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        const returnedIssues = issues.filter(issue => 
            issue.memberId === memberId && 
            issue.status === 'returned' && 
            issue.fine && 
            issue.fine > 0
        );
        
        return returnedIssues.map(issue => {
            const book = books.find(b => b.id === issue.bookId);
            const daysOverdue = issue.daysOverdue || 0;
            
            return {
                issueId: issue.id,
                bookTitle: book ? book.title : 'Unknown',
                issueDate: issue.issueDate,
                dueDate: issue.dueDate,
                returnDate: issue.returnDate,
                daysOverdue: daysOverdue,
                fine: issue.fine,
                status: 'paid'
            };
        });
    }

    // Record fine payment
    function recordPayment(issueId, amount, paymentMethod = 'cash') {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const issue = issues.find(i => i.id === issueId);
        
        if (!issue) {
            return { success: false, message: 'Issue not found' };
        }
        
        if (issue.status === 'returned') {
            return { success: false, message: 'Book already returned. Fine already recorded.' };
        }
        
        const currentFine = calculateFine(issue);
        
        if (amount < currentFine) {
            return { success: false, message: 'Partial payment not allowed. Full fine must be paid.' };
        }
        
        // Create fine payment record
        const fines = getAllFines();
        const fineRecord = {
            id: 'F' + Date.now(),
            issueId: issueId,
            memberId: issue.memberId,
            bookId: issue.bookId,
            amount: currentFine,
            paymentMethod: paymentMethod,
            paidDate: new Date().toISOString(),
            status: 'paid'
        };
        
        fines.push(fineRecord);
        saveFines(fines);
        
        // Mark fine as paid in issue (but book still not returned)
        issue.finePaid = true;
        issue.finePaidDate = new Date().toISOString();
        issue.finePaidAmount = currentFine;
        
        LibraryStore.save(LibraryStore.KEYS.issues, issues);
        
        return { 
            success: true, 
            message: 'Fine payment recorded successfully',
            fineRecord: fineRecord
        };
    }

    // Waive fine (admin only)
    function waiveFine(issueId, reason) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const issue = issues.find(i => i.id === issueId);
        
        if (!issue) {
            return { success: false, message: 'Issue not found' };
        }
        
        const currentFine = calculateFine(issue);
        
        // Record waiver
        const fines = getAllFines();
        const waiverRecord = {
            id: 'W' + Date.now(),
            issueId: issueId,
            memberId: issue.memberId,
            bookId: issue.bookId,
            amount: currentFine,
            reason: reason || 'No reason provided',
            waivedDate: new Date().toISOString(),
            status: 'waived'
        };
        
        fines.push(waiverRecord);
        saveFines(fines);
        
        // Mark fine as waived
        issue.fineWaived = true;
        issue.fineWaivedDate = new Date().toISOString();
        issue.fineWaivedReason = reason;
        
        LibraryStore.save(LibraryStore.KEYS.issues, issues);
        
        return { 
            success: true, 
            message: 'Fine waived successfully',
            waiverRecord: waiverRecord
        };
    }

    // Get all members with outstanding fines
    function getMembersWithFines() {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);
        const memberFines = {};
        
        issues.forEach(issue => {
            if (issue.status !== 'returned' && !issue.finePaid && !issue.fineWaived) {
                const fine = calculateFine(issue);
                if (fine > 0) {
                    if (!memberFines[issue.memberId]) {
                        memberFines[issue.memberId] = 0;
                    }
                    memberFines[issue.memberId] += fine;
                }
            }
        });
        
        return Object.entries(memberFines)
            .map(([memberId, totalFine]) => {
                const member = members.find(m => m.id === memberId);
                return {
                    memberId: memberId,
                    memberName: member ? member.name : 'Unknown',
                    memberEmail: member ? member.email : 'Unknown',
                    totalFine: totalFine
                };
            })
            .sort((a, b) => b.totalFine - a.totalFine);
    }

    // Get library-wide fine statistics
    function getFineStats() {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const fines = getAllFines();
        
        let totalOutstanding = 0;
        let totalPaid = 0;
        let totalWaived = 0;
        
        // Calculate outstanding fines
        issues.forEach(issue => {
            if (issue.status !== 'returned' && !issue.finePaid && !issue.fineWaived) {
                totalOutstanding += calculateFine(issue);
            }
        });
        
        // Sum paid and waived fines
        fines.forEach(fine => {
            if (fine.status === 'paid') {
                totalPaid += fine.amount;
            } else if (fine.status === 'waived') {
                totalWaived += fine.amount;
            }
        });
        
        // Get top defaulters
        const membersWithFines = getMembersWithFines();
        const topDefaulters = membersWithFines.slice(0, 5);
        
        return {
            totalOutstanding: totalOutstanding,
            totalPaid: totalPaid,
            totalWaived: totalWaived,
            totalCollected: totalPaid,
            membersWithFines: membersWithFines.length,
            topDefaulters: topDefaulters
        };
    }

    // Generate fine reminder message
    function getFineReminderMessage(memberId) {
        const fineInfo = getMemberFines(memberId);
        
        if (fineInfo.totalOutstanding === 0) {
            return null;
        }
        
        let message = 'You have outstanding fines totaling $' + fineInfo.totalOutstanding.toFixed(2) + '\\n\\n';
        message += 'Details:\\n';
        
        fineInfo.activeFines.forEach(fine => {
            message += '- ' + fine.bookTitle + ': $' + fine.fine.toFixed(2) + ' (' + fine.daysOverdue + ' days overdue)\\n';
        });
        
        message += '\\nPlease pay your fines at the library desk.';
        
        return message;
    }

    // Render fine table
    function renderFineTable(fines, showActions = true) {
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        
        let html = '<table class="data-table">';
        html += '<thead><tr>';
        html += '<th>Book</th>';
        html += '<th>Due Date</th>';
        html += '<th>Days Overdue</th>';
        html += '<th>Fine Amount</th>';
        html += '<th>Status</th>';
        if (showActions) html += '<th>Actions</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        if (fines.length === 0) {
            html += '<tr><td colspan="' + (showActions ? '6' : '5') + '" style="text-align: center; color: #999;">No fines</td></tr>';
        } else {
            fines.forEach(fine => {
                const statusClass = fine.status === 'outstanding' ? 'status-overdue' : 'status-paid';
                
                html += '<tr>';
                html += '<td>' + fine.bookTitle + '</td>';
                html += '<td>' + new Date(fine.dueDate).toLocaleDateString() + '</td>';
                html += '<td>' + fine.daysOverdue + ' days</td>';
                html += '<td>$' + fine.fine.toFixed(2) + '</td>';
                html += '<td><span class="' + statusClass + '">' + fine.status + '</span></td>';
                
                if (showActions && fine.status === 'outstanding') {
                    html += '<td>';
                    html += '<button class="btn-icon" onclick="payFine(\'' + fine.issueId + '\', ' + fine.fine + ')">Pay</button> ';
                    html += '</td>';
                }
                
                html += '</tr>';
            });
        }
        
        html += '</tbody></table>';
        
        return html;
    }

    // Public API
    window.FineHelper = {
        FINE_RATE_PER_DAY: FINE_RATE_PER_DAY,
        MAX_FINE_PER_BOOK: MAX_FINE_PER_BOOK,
        calculateFine: calculateFine,
        getMemberFines: getMemberFines,
        recordPayment: recordPayment,
        waiveFine: waiveFine,
        getMembersWithFines: getMembersWithFines,
        getFineStats: getFineStats,
        getFineReminderMessage: getFineReminderMessage,
        renderFineTable: renderFineTable
    };

})();

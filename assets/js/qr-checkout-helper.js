// QR-Based Checkout System
(function() {
    'use strict';

    let videoStream = null;
    let scannerActive = false;
    let scanningPaused = false;
    let lastScanTime = 0;
    const SCAN_COOLDOWN = 2000; // 2 seconds between scans

    // Initialize QR scanner
    function initScanner(videoElementId, onScanCallback) {
        const video = document.getElementById(videoElementId);
        if (!video) {
            console.error('Video element not found:', videoElementId);
            return false;
        }

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Camera access not supported in this browser');
            return false;
        }

        // Request camera access
        navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Use rear camera on mobile
        })
        .then(stream => {
            videoStream = stream;
            video.srcObject = stream;
            video.play();
            scannerActive = true;
            
            // Start scanning loop
            if (onScanCallback) {
                startScanningLoop(video, onScanCallback);
            }
            
            return true;
        })
        .catch(error => {
            console.error('Camera access error:', error);
            showError('Could not access camera. Please check permissions.');
            return false;
        });
    }

    // Start continuous scanning
    function startScanningLoop(video, callback) {
        if (!scannerActive) return;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        function scan() {
            if (!scannerActive || !video.videoWidth) {
                if (scannerActive) {
                    requestAnimationFrame(scan);
                }
                return;
            }

            // Skip scanning if paused (but keep the loop running)
            if (scanningPaused) {
                requestAnimationFrame(scan);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code && code.data) {
                    const now = Date.now();
                    if (now - lastScanTime > SCAN_COOLDOWN) {
                        lastScanTime = now;
                        callback(code.data);
                    }
                }
            } catch (err) {
                console.error('QR scanning error:', err);
            }

            requestAnimationFrame(scan);
        }

        scan();
    }

    // Pause scanning (keeps camera active)
    function pauseScanning() {
        scanningPaused = true;
    }

    // Resume scanning
    function resumeScanning() {
        scanningPaused = false;
        lastScanTime = Date.now(); // Reset cooldown to prevent immediate re-scan
    }

    // Stop scanner and release camera
    function stopScanner() {
        scannerActive = false;
        scanningPaused = false;
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
    }

    // Manual checkout (type in IDs)
    function manualCheckout(memberId, bookId) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);

        // Validate member
        const member = members.find(m => m.id === memberId);
        if (!member) {
            return { success: false, message: 'Member not found: ' + memberId };
        }

        // Validate book
        const book = books.find(b => b.id === bookId);
        if (!book) {
            return { success: false, message: 'Book not found: ' + bookId };
        }

        // Check if book is available
        if (book.availableCopies <= 0) {
            return { success: false, message: 'Book is not available: ' + book.title };
        }

        // Check if member has outstanding fines
        if (window.FineHelper) {
            const fineInfo = FineHelper.getMemberFines(memberId);
            if (fineInfo.totalOutstanding > 0) {
                return { 
                    success: false, 
                    message: 'Member has outstanding fines: $' + fineInfo.totalOutstanding.toFixed(2) + '\\nPlease clear fines before borrowing.',
                    fines: fineInfo.totalOutstanding
                };
            }
        }

        // Check max borrow limit (e.g., 5 books)
        const activeIssues = issues.filter(i => i.memberId === memberId && i.status !== 'returned');
        const MAX_BORROW_LIMIT = 5;
        if (activeIssues.length >= MAX_BORROW_LIMIT) {
            return { 
                success: false, 
                message: 'Member has reached maximum borrow limit (' + MAX_BORROW_LIMIT + ' books)' 
            };
        }

        // Create issue
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // 14 days borrow period

        const newIssue = {
            id: LibraryStore.nextId('I', issues),
            bookId: bookId,
            memberId: memberId,
            issueDate: issueDate.toISOString(),
            dueDate: dueDate.toISOString(),
            status: 'issued',
            issuedBy: localStorage.getItem('userEmail') || 'librarian'
        };

        issues.push(newIssue);
        LibraryStore.save(LibraryStore.KEYS.issues, issues);

        // Decrease available copies
        book.availableCopies -= 1;
        LibraryStore.save(LibraryStore.KEYS.books, books);

        return {
            success: true,
            message: 'Book issued successfully!',
            issue: newIssue,
            member: member,
            book: book,
            dueDate: dueDate.toLocaleDateString()
        };
    }

    // QR-based checkout (scan member QR, then book QR/barcode)
    let pendingCheckout = null;

    function getRecordTimestamp(record) {
        const rawValue = record && (record.updatedDate || record.createdDate || record.memberSince);
        if (!rawValue) return 0;
        const timestamp = new Date(rawValue).getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function normalize(value) {
        return String(value || '').trim().toLowerCase();
    }

    function pickMostRecent(records) {
        if (!Array.isArray(records) || records.length === 0) return null;
        return records
            .map((record, index) => ({
                record,
                index,
                timestamp: getRecordTimestamp(record)
            }))
            .sort((first, second) => {
                if (second.timestamp !== first.timestamp) {
                    return second.timestamp - first.timestamp;
                }
                return second.index - first.index;
            })[0].record;
    }

    function resolveMemberAndUser(memberData, members, users) {
        const qrMemberId = String(memberData.id || '').trim();
        const qrEmail = normalize(memberData.email);

        let memberCandidates = members.filter((member) => String(member.id || '').trim() === qrMemberId);
        if (qrEmail && memberCandidates.length > 0) {
            const emailMatches = memberCandidates.filter((member) => normalize(member.email) === qrEmail);
            if (emailMatches.length > 0) {
                memberCandidates = emailMatches;
            }
        }

        if (memberCandidates.length === 0 && qrEmail) {
            memberCandidates = members.filter((member) => normalize(member.email) === qrEmail);
        }

        const resolvedMember = pickMostRecent(memberCandidates);

        let resolvedUser = null;
        if (resolvedMember) {
            const memberId = String(resolvedMember.id || '').trim();
            const memberEmail = normalize(resolvedMember.email);
            const userCandidates = users.filter((user) => {
                const userMemberId = String(user.memberId || '').trim();
                return userMemberId === memberId && (!user.role || user.role === 'student');
            });

            let filteredUserCandidates = userCandidates;
            if (qrEmail) {
                const qrEmailUsers = filteredUserCandidates.filter((user) => normalize(user.email) === qrEmail);
                if (qrEmailUsers.length > 0) {
                    filteredUserCandidates = qrEmailUsers;
                }
            } else if (memberEmail) {
                const memberEmailUsers = filteredUserCandidates.filter((user) => normalize(user.email) === memberEmail);
                if (memberEmailUsers.length > 0) {
                    filteredUserCandidates = memberEmailUsers;
                }
            }

            resolvedUser = pickMostRecent(filteredUserCandidates);
        }

        if (!resolvedUser && qrEmail) {
            const emailUsers = users.filter((user) => normalize(user.email) === qrEmail && (!user.role || user.role === 'student'));
            resolvedUser = pickMostRecent(emailUsers);
        }

        return {
            member: resolvedMember,
            user: resolvedUser
        };
    }

    // Display membership card modal
    function displayMembershipCard(memberData) {
        const users = LibraryStore.load(LibraryStore.KEYS.users, []);
        const members = LibraryStore.load(LibraryStore.KEYS.members, []);

        const resolved = resolveMemberAndUser(memberData, members, users);
        const member = resolved.member;
        const user = resolved.user;

        const scannedEmail = normalize(memberData.email);
        const memberName = (member && member.name) || memberData.name || (user ? [user.firstName || '', user.lastName || ''].join(' ').trim() : '') || 'Unknown';
        const memberEmail = memberData.email || (member && member.email) || (user && user.email) || 'N/A';
        const memberSince = member ? new Date(member.memberSince || member.createdDate).toLocaleDateString() : 'N/A';
        const memberRole = memberData.type || (user ? user.role : 'student');
        
        // Get profile photo - check both member and user records
        let memberPhoto = '';
        if (member && member.profilePhoto) {
            const memberEmail = normalize(member.email);
            if (!scannedEmail || !memberEmail || memberEmail === scannedEmail) {
                memberPhoto = member.profilePhoto;
            }
        }

        if (!memberPhoto && user && user.profilePhoto) {
            const userEmail = normalize(user.email);
            if (!scannedEmail || (userEmail && userEmail === scannedEmail)) {
                memberPhoto = user.profilePhoto;
            }
        }

        if (!memberPhoto && member && member.profilePhoto) {
            memberPhoto = member.profilePhoto;
        }
        
        // Debug logging
        console.log('Member Data:', memberData);
        console.log('Member Record:', member);
        console.log('User Record:', user);
        console.log('Profile Photo:', memberPhoto ? 'Found' : 'Not found');
        
        // Create modal HTML
        // Pause scanning to prevent continuous refresh
        pauseScanning();

        // Photo display - show photo if available, otherwise show placeholder
        const photoHtml = memberPhoto 
            ? `<div class="membership-card-photo">
                <img src="${memberPhoto}" alt="${memberName}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 10px; border: 3px solid #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
               </div>`
            : `<div class="membership-card-photo">
                <div style="width: 150px; height: 150px; border-radius: 10px; border: 3px solid #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                    <span style="font-size: 60px; color: white;">👤</span>
                </div>
               </div>`;

        const modalHTML = `
            <div class="membership-card-overlay" id="membershipCardOverlay">
                <div class="membership-card-container">
                    <button class="membership-card-close" onclick="window.QRCheckoutHelper.closeMembershipCard()">&times;</button>
                    <div class="membership-card">
                        <div class="membership-card-header">
                            <h2>📇 Membership Card</h2>
                        </div>
                        ${photoHtml}
                        <div class="membership-card-body">
                            <div class="membership-field">
                                <span class="membership-label">Member ID:</span>
                                <span class="membership-value">${memberData.id}</span>
                            </div>
                            <div class="membership-field">
                                <span class="membership-label">Member Name:</span>
                                <span class="membership-value">${memberName}</span>
                            </div>
                            <div class="membership-field">
                                <span class="membership-label">Email:</span>
                                <span class="membership-value">${memberEmail}</span>
                            </div>
                            <div class="membership-field">
                                <span class="membership-label">Member Since:</span>
                                <span class="membership-value">${memberSince}</span>
                            </div>
                            <div class="membership-field">
                                <span class="membership-label">Role:</span>
                                <span class="membership-value membership-role">${memberRole.toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="membership-card-footer">
                            <button class="membership-card-btn btn-primary" onclick="window.QRCheckoutHelper.proceedWithCheckout('${memberData.id}', '${memberName}'); window.QRCheckoutHelper.closeMembershipCard();">
                                ✓ Proceed to Checkout
                            </button>
                            <button class="membership-card-btn btn-secondary" onclick="window.QRCheckoutHelper.closeMembershipCard()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing membership card
        const existing = document.getElementById('membershipCardOverlay');
        if (existing) existing.remove();
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Auto fade-in animation
        setTimeout(() => {
            const overlay = document.getElementById('membershipCardOverlay');
            if (overlay) overlay.classList.add('show');
        }, 10);
    }

    // Proceed with checkout after viewing card
    function proceedWithCheckout(memberId, memberName) {
        pendingCheckout = { memberId: memberId, memberName: memberName };
        showNotification('Ready', 'Now scan the book barcode to complete checkout', 'info');
    }

    function handleQRScan(qrData) {
        try {
            // Try to parse as JSON (member QR code)
            const data = JSON.parse(qrData);
            
            if (data.id && data.type === 'student') {
                // This is a member QR code - display membership card
                displayMembershipCard(data);
                return {
                    type: 'member',
                    data: data
                };
            }
        } catch (e) {
            // Not JSON, might be a book barcode
            if (pendingCheckout && pendingCheckout.memberId) {
                // We have a member, this must be the book
                const result = manualCheckout(pendingCheckout.memberId, qrData);
                pendingCheckout = null;
                
                if (result.success) {
                    showNotification('Success', result.message, 'success');
                } else {
                    showNotification('Error', result.message, 'error');
                }
                
                return {
                    type: 'complete',
                    result: result
                };
            } else {
                // No pending member, this is just a book scan
                return {
                    type: 'book',
                    bookId: qrData
                };
            }
        }
    }

    // Batch checkout (multiple books at once)
    function batchCheckout(memberId, bookIds) {
        const results = [];
        let successCount = 0;
        let failCount = 0;

        bookIds.forEach(bookId => {
            const result = manualCheckout(memberId, bookId);
            results.push({
                bookId: bookId,
                ...result
            });

            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
        });

        return {
            success: successCount > 0,
            message: successCount + ' books issued successfully' + (failCount > 0 ? ', ' + failCount + ' failed' : ''),
            successCount: successCount,
            failCount: failCount,
            results: results
        };
    }

    // Quick return using QR
    function quickReturn(issueId) {
        const issues = LibraryStore.load(LibraryStore.KEYS.issues, []);
        const issue = issues.find(i => i.id === issueId);

        if (!issue || issue.status === 'returned') {
            return { success: false, message: 'Issue not found or already returned' };
        }

        // Calculate fine
        const fine = window.FineHelper ? FineHelper.calculateFine(issue) : 0;
        
        // Mark as returned
        issue.status = 'returned';
        issue.returnDate = new Date().toISOString();
        issue.fine = fine;
        issue.daysOverdue = fine > 0 ? Math.ceil(fine / 1) : 0;

        // Add to borrowed history for reviews
        if (window.ReviewsHelper) {
            ReviewsHelper.addToBorrowedHistory(issue.memberId, issue.bookId, issue.issueDate, issue.returnDate);
        }

        // Increase available copies
        const books = LibraryStore.load(LibraryStore.KEYS.books, []);
        const book = books.find(b => b.id === issue.bookId);
        if (book) {
            book.availableCopies += 1;
            LibraryStore.save(LibraryStore.KEYS.books, books);
        }

        LibraryStore.save(LibraryStore.KEYS.issues, issues);

        return {
            success: true,
            message: 'Book returned successfully!' + (fine > 0 ? ' Fine: $' + fine : ''),
            fine: fine,
            issue: issue
        };
    }

    // Helper to show notifications
    function showNotification(title, message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(title, message, type);
        } else {
            alert(title + '\\n' + message);
        }
    }

    // Helper to show error
    function showError(message) {
        showNotification('Error', message, 'error');
    }

    // Close membership card and resume scanning
    function closeMembershipCard() {
        const overlay = document.getElementById('membershipCardOverlay');
        if (overlay) overlay.remove();
        resumeScanning();
    }

    // Public API
    window.QRCheckoutHelper = {
        initScanner: initScanner,
        stopScanner: stopScanner,
        pauseScanning: pauseScanning,
        resumeScanning: resumeScanning,
        handleQRScan: handleQRScan,
        manualCheckout: manualCheckout,
        batchCheckout: batchCheckout,
        quickReturn: quickReturn,
        displayMembershipCard: displayMembershipCard,
        proceedWithCheckout: proceedWithCheckout,
        closeMembershipCard: closeMembershipCard,
        getPendingCheckout: () => pendingCheckout,
        clearPendingCheckout: () => { pendingCheckout = null; },
        MAX_BORROW_LIMIT: 5,
        BORROW_PERIOD_DAYS: 14
    };

})();

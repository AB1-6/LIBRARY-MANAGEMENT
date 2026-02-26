/**
 * Wishlist & Waitlist Module
 * Manages student book wishlists and waitlists
 */

const WishlistHelper = {
    // Get wishlist for current member
    getWishlist: function(memberId) {
        const allWishlist = LibraryStore.load(LibraryStore.KEYS.wishlist, []);
        return memberId ? allWishlist.filter(w => w.memberId === memberId) : allWishlist;
    },

    // Get waitlist for current member
    getWaitlist: function(memberId) {
        const allWaitlist = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
        return memberId ? allWaitlist.filter(w => w.memberId === memberId) : allWaitlist;
    },

    // Add book to wishlist
    addToWishlist: function(memberId, bookId) {
        const wishlist = LibraryStore.load(LibraryStore.KEYS.wishlist, []);
        
        // Check if already in wishlist
        const exists = wishlist.some(w => w.memberId === memberId && w.bookId === bookId);
        if (exists) {
            return { success: false, message: 'Already in wishlist' };
        }

        const newItem = {
            id: 'WL' + Date.now(),
            memberId: memberId,
            bookId: bookId,
            addedDate: new Date().toISOString()
        };

        wishlist.push(newItem);
        LibraryStore.save(LibraryStore.KEYS.wishlist, wishlist);
        
        return { success: true, message: 'Added to wishlist' };
    },

    // Remove from wishlist
    removeFromWishlist: function(wishlistId) {
        let wishlist = LibraryStore.load(LibraryStore.KEYS.wishlist, []);
        wishlist = wishlist.filter(w => w.id !== wishlistId);
        LibraryStore.save(LibraryStore.KEYS.wishlist, wishlist);
        
        return { success: true, message: 'Removed from wishlist' };
    },

    // Check if book is in member's wishlist
    isInWishlist: function(memberId, bookId) {
        const wishlist = this.getWishlist(memberId);
        return wishlist.some(w => w.bookId === bookId);
    },

    // Join waitlist for out-of-stock book
    joinWaitlist: function(memberId, bookId) {
        const waitlist = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
        
        // Check if already in waitlist
        const exists = waitlist.some(w => w.memberId === memberId && w.bookId === bookId && w.status === 'waiting');
        if (exists) {
            return { success: false, message: 'Already in waitlist' };
        }

        // Calculate position (number of people waiting for this book)
        const position = waitlist.filter(w => w.bookId === bookId && w.status === 'waiting').length + 1;

        const newItem = {
            id: 'WT' + Date.now(),
            memberId: memberId,
            bookId: bookId,
            position: position,
            requestDate: new Date().toISOString(),
            status: 'waiting' // 'waiting', 'notified', 'fulfilled'
        };

        waitlist.push(newItem);
        LibraryStore.save(LibraryStore.KEYS.waitlist, waitlist);
        
        return { success: true, message: `Joined waitlist (Position: ${position})`, position: position };
    },

    // Leave waitlist
    leaveWaitlist: function(waitlistId) {
        let waitlist = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
        const item = waitlist.find(w => w.id === waitlistId);
        
        if (item) {
            // Remove this item
            waitlist = waitlist.filter(w => w.id !== waitlistId);
            
            // Update positions for remaining people waiting for the same book
            waitlist.forEach(w => {
                if (w.bookId === item.bookId && w.status === 'waiting' && w.position > item.position) {
                    w.position--;
                }
            });
            
            LibraryStore.save(LibraryStore.KEYS.waitlist, waitlist);
        }
        
        return { success: true, message: 'Removed from waitlist' };
    },

    // Check if member is in waitlist for book
    isInWaitlist: function(memberId, bookId) {
        const waitlist = this.getWaitlist(memberId);
        return waitlist.some(w => w.bookId === bookId && w.status === 'waiting');
    },

    // Get waitlist position for a specific book
    getWaitlistPosition: function(memberId, bookId) {
        const waitlist = this.getWaitlist(memberId);
        const item = waitlist.find(w => w.bookId === bookId && w.status === 'waiting');
        return item ? item.position : null;
    },

    // Notify next person in waitlist when book becomes available
    notifyNextInWaitlist: function(bookId) {
        const waitlist = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
        
        // Find next person waiting (position 1, status waiting)
        const nextPerson = waitlist.find(w => w.bookId === bookId && w.position === 1 && w.status === 'waiting');
        
        if (nextPerson) {
            // Mark as notified
            nextPerson.status = 'notified';
            nextPerson.notifiedDate = new Date().toISOString();
            LibraryStore.save(LibraryStore.KEYS.waitlist, waitlist);
            
            // Show notification if the notification system is available
            if (typeof showNotification === 'function') {
                const books = LibraryStore.load(LibraryStore.KEYS.books, []);
                const book = books.find(b => b.id === bookId);
                if (book) {
                    showNotification(
                        'Book Available!',
                        `"${book.title}" is now available. Request it now!`,
                        'success'
                    );
                }
            }
            
            return { success: true, memberId: nextPerson.memberId };
        }
        
        return { success: false, message: 'No one waiting' };
    },

    // Mark waitlist item as fulfilled when member borrows the book
    fulfillWaitlist: function(memberId, bookId) {
        let waitlist = LibraryStore.load(LibraryStore.KEYS.waitlist, []);
        const item = waitlist.find(w => w.memberId === memberId && w.bookId === bookId && w.status !== 'fulfilled');
        
        if (item) {
            item.status = 'fulfilled';
            item.fulfilledDate = new Date().toISOString();
            
            // Update positions for remaining people
            waitlist.forEach(w => {
                if (w.bookId === bookId && w.status === 'waiting' && w.position > item.position) {
                    w.position--;
                }
            });
            
            LibraryStore.save(LibraryStore.KEYS.waitlist, waitlist);
        }
    }
};

// Make it globally available
if (typeof window !== 'undefined') {
    window.WishlistHelper = WishlistHelper;
}

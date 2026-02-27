/**
 * Image Helper Module
 * Handles image uploads, conversions, and display
 */

const ImageHelper = {
    // Convert image file to base64
    fileToBase64: function(file) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Invalid file type. Please upload an image.'));
                return;
            }

            // Check file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                reject(new Error('File too large. Maximum size is 2MB.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    },

    // Compress and resize image
    compressImage: function(base64, maxWidth = 400, maxHeight = 600) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = width * ratio;
                    height = height * ratio;
                }

                // Create canvas and draw compressed image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 with compression
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                resolve(compressed);
            };
            img.onerror = reject;
            img.src = base64;
        });
    },

    // Get placeholder image
    getPlaceholder: function() {
        // SVG placeholder - book icon with better styling
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
            <defs>
                <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8e8e93;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#636366;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="200" height="300" fill="#f2f2f7"/>
            <rect x="40" y="50" width="120" height="200" rx="8" fill="url(#bookGrad)"/>
            <rect x="40" y="50" width="10" height="200" fill="#48484a" opacity="0.3"/>
            <rect x="55" y="70" width="90" height="4" rx="2" fill="#ffffff" opacity="0.6"/>
            <rect x="55" y="90" width="70" height="3" rx="1.5" fill="#ffffff" opacity="0.4"/>
            <rect x="55" y="105" width="85" height="3" rx="1.5" fill="#ffffff" opacity="0.4"/>
            <circle cx="100" cy="180" r="25" fill="#ffffff" opacity="0.2"/>
            <path d="M 100 165 L 100 195 M 85 180 L 115 180" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.3"/>
        </svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },

    // Create image preview element
    createPreview: function(src, onRemove) {
        const container = document.createElement('div');
        container.className = 'image-preview-container';
        container.style.cssText = 'position: relative; display: inline-block; margin-top: 10px;';

        const img = document.createElement('img');
        img.src = src || this.getPlaceholder();
        img.style.cssText = 'max-width: 150px; max-height: 200px; border-radius: 4px; border: 2px solid #ddd;';
        
        if (onRemove && src) {
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.type = 'button';
            removeBtn.style.cssText = `
                position: absolute; 
                top: -8px; 
                right: -8px; 
                width: 24px; 
                height: 24px; 
                border-radius: 50%; 
                background: #f44336; 
                color: white; 
                border: none; 
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
            `;
            removeBtn.onclick = onRemove;
            container.appendChild(removeBtn);
        }
        
        container.appendChild(img);
        return container;
    },

    // Handle file input change
    handleFileInput: function(input, onSuccess, onError) {
        if (!input.files || !input.files[0]) {
            return;
        }

        const file = input.files[0];
        
        this.fileToBase64(file)
            .then(base64 => this.compressImage(base64))
            .then(compressed => {
                if (onSuccess) onSuccess(compressed);
            })
            .catch(error => {
                if (onError) onError(error.message);
            });
    }
};

// Make it globally available
if (typeof window !== 'undefined') {
    window.ImageHelper = ImageHelper;
}

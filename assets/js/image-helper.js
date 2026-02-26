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
        // SVG placeholder - book icon
        return 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
                <rect width="200" height="300" fill="#e0e0e0"/>
                <g transform="translate(60, 100)">
                    <path d="M10 0 L70 0 L70 100 L40 85 L10 100 Z" fill="#9e9e9e"/>
                    <text x="40" y="50" font-size="40" fill="white" text-anchor="middle">📚</text>
                </g>
            </svg>
        `.trim());
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

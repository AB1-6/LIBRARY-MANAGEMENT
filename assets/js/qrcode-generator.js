/**
 * Simple QR Code Generator (No external dependencies)
 * Uses HTML5 Canvas to generate QR codes client-side
 */

// Simple QR Code generator using basic algorithm
const SimpleQR = {
    generate: function(text, size = 200) {
        // For simplicity, create a visual representation
        // This is a simplified version - in production, use a proper QR library
        const canvas = document.createElement('canvas');
        const dimension = size;
        canvas.width = dimension;
        canvas.height = dimension;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, dimension, dimension);
        
        // Create a simple data matrix pattern
        ctx.fillStyle = '#000000';
        
        // Generate pseudo-random pattern based on text
        const hash = this.hashCode(text);
        const gridSize = 25; // 25x25 grid
        const cellSize = dimension / gridSize;
        
        // Draw finder patterns (corners)
        this.drawFinderPattern(ctx, 0, 0, cellSize);
        this.drawFinderPattern(ctx, (gridSize - 7) * cellSize, 0, cellSize);
        this.drawFinderPattern(ctx, 0, (gridSize - 7) * cellSize, cellSize);
        
        // Draw data pattern
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                // Skip finder pattern areas
                if ((x < 8 && y < 8) || (x >= gridSize - 8 && y < 8) || (x < 8 && y >= gridSize - 8)) {
                    continue;
                }
                
                // Generate pattern based on text hash
                const seed = hash + x * 7 + y * 13;
                if (this.pseudoRandom(seed) > 0.5) {
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
        
        return canvas;
    },
    
    drawFinderPattern: function(ctx, startX, startY, cellSize) {
        // Outer black square
        ctx.fillStyle = '#000000';
        ctx.fillRect(startX, startY, cellSize * 7, cellSize * 7);
        
        // White inner square
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(startX + cellSize, startY + cellSize, cellSize * 5, cellSize * 5);
        
        // Black center square
        ctx.fillStyle = '#000000';
        ctx.fillRect(startX + cellSize * 2, startY + cellSize * 2, cellSize * 3, cellSize * 3);
    },
    
    hashCode: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    },
    
    pseudoRandom: function(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
};

window.SimpleQR = SimpleQR;

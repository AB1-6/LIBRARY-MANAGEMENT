// Simple Chart Rendering Helper (No dependencies)
(function() {
    'use strict';

    // Render a bar chart
    function renderBarChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const {
            title = '',
            xLabel = '',
            yLabel = '',
            color = '#4CAF50',
            showValues = true
        } = options;
        
        const padding = { top: 40, right: 20, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        // Find max value
        const maxValue = Math.max(...data.map(d => d.value), 1);
        const yScale = chartHeight / maxValue;
        const barWidth = chartWidth / data.length * 0.7;
        const barGap = chartWidth / data.length * 0.3;
        
        // Draw title
        if (title) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, width / 2, 20);
        }
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
        
        // Draw y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const value = Math.round((maxValue / ySteps) * i);
            const y = height - padding.bottom - (chartHeight / ySteps) * i;
            ctx.fillText(value.toString(), padding.left - 10, y + 4);
            
            // Draw grid line
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
        
        // Draw bars
        data.forEach((item, index) => {
            const x = padding.left + index * (barWidth + barGap) + barGap / 2;
            const barHeight = item.value * yScale;
            const y = height - padding.bottom - barHeight;
            
            // Draw bar
            ctx.fillStyle = item.color || color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw value on top of bar
            if (showValues && item.value > 0) {
                ctx.fillStyle = '#333';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
            }
            
            // Draw x-axis label
            ctx.fillStyle = '#666';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding.bottom + 15);
            if (item.label.length > 8) {
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
            }
            ctx.fillText(item.label, 0, 0);
            ctx.restore();
        });
        
        // Draw axis labels
        if (yLabel) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.save();
            ctx.translate(15, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(yLabel, 0, 0);
            ctx.restore();
        }
        
        if (xLabel) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(xLabel, width / 2, height - 10);
        }
    }

    // Render a line chart
    function renderLineChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const {
            title = '',
            xLabel = '',
            yLabel = '',
            color = '#2196F3',
            fillArea = true
        } = options;
        
        const padding = { top: 40, right: 20, bottom: 60, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        // Find max value
        const maxValue = Math.max(...data.map(d => d.value), 1);
        const yScale = chartHeight / maxValue;
        const xStep = chartWidth / (data.length - 1);
        
        // Draw title
        if (title) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, width / 2, 20);
        }
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();
        
        // Draw y-axis labels and grid
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const value = Math.round((maxValue / ySteps) * i);
            const y = height - padding.bottom - (chartHeight / ySteps) * i;
            ctx.fillText(value.toString(), padding.left - 10, y + 4);
            
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
        
        // Draw filled area
        if (fillArea) {
            ctx.fillStyle = color + '20'; // Add transparency
            ctx.beginPath();
            ctx.moveTo(padding.left, height - padding.bottom);
            data.forEach((item, index) => {
                const x = padding.left + index * xStep;
                const y = height - padding.bottom - item.value * yScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(padding.left + (data.length - 1) * xStep, height - padding.bottom);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        data.forEach((item, index) => {
            const x = padding.left + index * xStep;
            const y = height - padding.bottom - item.value * yScale;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw points and labels
        data.forEach((item, index) => {
            const x = padding.left + index * xStep;
            const y = height - padding.bottom - item.value * yScale;
            
            // Draw point
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw x-axis label
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x, height - padding.bottom + 15);
            if (item.label.length > 6) {
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
            }
            ctx.fillText(item.label, 0, 0);
            ctx.restore();
        });
        
        // Draw axis labels
        if (yLabel) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.save();
            ctx.translate(15, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(yLabel, 0, 0);
            ctx.restore();
        }
        
        if (xLabel) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(xLabel, width / 2, height - 10);
        }
    }

    // Render a pie/donut chart
    function renderPieChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        const {
            title = '',
            donut = false,
            donutHoleSize = 0.5
        } = options;
        
        const centerX = width / 2;
        const centerY = height / 2 + 20;
        const radius = Math.min(width, height) / 2 - 80;
        
        // Draw title
        if (title) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title, centerX, 20);
        }
        
        // Calculate total
        const total = data.reduce((sum, item) => sum + item.value, 0);
        
        // Color palette
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ];
        
        let currentAngle = -Math.PI / 2; // Start at top
        
        // Draw slices
        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * Math.PI * 2;
            const color = item.color || colors[index % colors.length];
            
            // Draw slice
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
            const percentage = ((item.value / total) * 100).toFixed(1);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = labelX > centerX ? 'left' : 'right';
            ctx.fillText(item.label + ' (' + percentage + '%)', labelX, labelY);
            
            currentAngle += sliceAngle;
        });
        
        // Draw donut hole
        if (donut) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * donutHoleSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw total in center
            ctx.fillStyle = '#333';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(total.toString(), centerX, centerY);
            ctx.font = '12px Arial';
            ctx.fillText('Total', centerX, centerY + 20);
        }
    }

    // Public API
    window.ChartHelper = {
        renderBarChart: renderBarChart,
        renderLineChart: renderLineChart,
        renderPieChart: renderPieChart
    };

})();

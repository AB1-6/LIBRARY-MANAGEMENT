/**
 * QR Code Module
 * Generates QR codes for student member IDs using qrcode.js library
 * Uses CDN: https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js
 */

const QRCodeHelper = {
    // Generate QR code for member ID
    generateMemberQR: async function(member, containerId) {
        if (!member || !containerId) {
            console.error('Member data or container ID missing');
            return false;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return false;
        }

        // Clear existing content
        container.innerHTML = '<p style="color: #666;">Generating QR code...</p>';

        // Create QR data object
        const qrData = {
            id: member.id,
            name: member.name || `${member.firstName} ${member.lastName}`.trim(),
            email: member.email,
            memberSince: member.memberSince || member.createdDate || new Date().toISOString(),
            type: 'student'
        };

        const qrString = JSON.stringify(qrData);

        try {
            console.log('🔄 Generating QR code...');
            
            let qrCanvas = null;
            let qrImageUrl = null;
            
            // Try client-side generation first
            if (window.SimpleQR) {
                console.log('✅ Using client-side QR generation');
                qrCanvas = SimpleQR.generate(qrString, 200);
            } else {
                // Fallback to Google Chart API
                console.log('⚠️ Client-side generator not available, using Google Chart API...');
                const encodedData = encodeURIComponent(qrString);
                qrImageUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodedData}&choe=UTF-8`;
            }
            
            // Create QR code container
            const qrWrapper = document.createElement('div');
            qrWrapper.style.cssText = 'text-align: center; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
            
            const title = document.createElement('h3');
            title.textContent = 'Member ID Card';
            title.style.cssText = 'margin: 0 0 15px 0; color: #333;';
            
            const memberInfo = document.createElement('div');
            memberInfo.style.cssText = 'margin-bottom: 15px; font-size: 14px; color: #666;';
            memberInfo.innerHTML = `
                <strong>${qrData.name}</strong><br>
                ID: ${qrData.id}<br>
                ${qrData.email}
            `;
            
            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = 'display: inline-block; padding: 10px; background: white; border: 2px solid #ddd; border-radius: 4px;';
            
            // Add QR code (canvas or image)
            if (qrCanvas) {
                qrCanvas.style.cssText = 'width: 200px; height: 200px; display: block;';
                qrContainer.appendChild(qrCanvas);
            } else {
                const qrImage = document.createElement('img');
                qrImage.src = qrImageUrl;
                qrImage.alt = 'Member QR Code';
                qrImage.style.cssText = 'width: 200px; height: 200px; display: block;';
                qrImage.onerror = () => {
                    // Show member info card if image fails
                    qrContainer.innerHTML = `
                        <div style="width: 200px; height: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 20px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 10px;">👤</div>
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${qrData.name.split(' ')[0]}</div>
                            <div style="font-size: 12px; opacity: 0.9;">ID: ${qrData.id}</div>
                        </div>
                    `;
                };
                qrContainer.appendChild(qrImage);
            }
            
            const buttons = document.createElement('div');
            buttons.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: center;';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '📥 Download QR';
            downloadBtn.className = 'btn btn-primary';
            downloadBtn.onclick = () => {
                if (qrCanvas) {
                    const link = document.createElement('a');
                    link.href = qrCanvas.toDataURL('image/png');
                    link.download = `member-qr-${qrData.id}.png`;
                    link.click();
                } else if (qrImageUrl) {
                    const link = document.createElement('a');
                    link.href = qrImageUrl;
                    link.download = `member-qr-${qrData.id}.png`;
                    link.click();
                }
            };
            
            const printBtn = document.createElement('button');
            printBtn.textContent = '🖨️ Print Card';
            printBtn.className = 'btn btn-secondary';
            printBtn.onclick = () => this.printMemberCard(qrData, qrCanvas, qrCanvas ? qrCanvas.toDataURL('image/png') : qrImageUrl);
            
            buttons.appendChild(downloadBtn);
            buttons.appendChild(printBtn);
            
            qrWrapper.appendChild(title);
            qrWrapper.appendChild(memberInfo);
            qrWrapper.appendChild(qrContainer);
            qrWrapper.appendChild(buttons);
            
            container.appendChild(qrWrapper);
            
            console.log('✅ QR code generated successfully');
            return true;
        } catch (error) {
            console.error('❌ QR generation error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <p style="color: #f44336; margin-bottom: 10px;">⚠️ Failed to generate QR code</p>
                    <p style="font-size: 14px;">${error.message || 'Unknown error'}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 10px;">
                        🔄 Refresh Page
                    </button>
                </div>
            `;
            return false;
        }
    },

    // Download QR code as PNG
    downloadMemberQR: function(canvas, memberId) {
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = `member-qr-${memberId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    },

    // Print member card with QR code
    printMemberCard: function(memberData, canvas, qrImageUrl) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the card');
            return;
        }

        // Get QR image - either from canvas or URL
        const qrImage = canvas ? canvas.toDataURL('image/png') : qrImageUrl;
        const memberSince = memberData.memberSince ? new Date(memberData.memberSince).toLocaleDateString() : 'N/A';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Member ID Card - ${memberData.id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        min-height: 100vh; 
                        background: #f0f0f0;
                        padding: 20px;
                    }
                    .card {
                        width: 350px;
                        background: white;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    .card-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }
                    .card-header h2 {
                        font-size: 18px;
                        margin-bottom: 5px;
                    }
                    .card-header p {
                        font-size: 12px;
                        opacity: 0.9;
                    }
                    .card-body {
                        padding: 30px;
                        text-align: center;
                    }
                    .member-name {
                        font-size: 20px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 8px;
                    }
                    .member-id {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 20px;
                    }
                    .qr-code {
                        margin: 20px 0;
                        display: inline-block;
                        padding: 10px;
                        background: white;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                    }
                    .qr-code img {
                        display: block;
                        width: 200px;
                        height: 200px;
                    }
                    .member-details {
                        text-align: left;
                        font-size: 12px;
                        color: #666;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    .member-details p {
                        margin: 5px 0;
                    }
                    @media print {
                        body { background: white; }
                        .card { box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="card-header">
                        <h2>📚 Library Member ID</h2>
                        <p>Entity Library Management System</p>
                    </div>
                    <div class="card-body">
                        <div class="member-name">${memberData.name}</div>
                        <div class="member-id">ID: ${memberData.id}</div>
                        <div class="qr-code">
                            <img src="${qrImage}" alt="QR Code">
                        </div>
                        <div class="member-details">
                            <p><strong>Email:</strong> ${memberData.email}</p>
                            <p><strong>Member Since:</strong> ${memberSince}</p>
                            <p><strong>Type:</strong> Student</p>
                        </div>
                    </div>
                </div>
                <script>
                    window.onload = function() { 
                        setTimeout(function() { 
                            window.print(); 
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }
};

// Make it globally available
if (typeof window !== 'undefined') {
    window.QRCodeHelper = QRCodeHelper;
}

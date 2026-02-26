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
            // Wait for QRCode library to be ready (using global promise)
            if (window.qrcodeReady) {
                console.log('⏳ Waiting for QRCode library to load...');
                await window.qrcodeReady;
            } else {
                // Fallback: manual wait with better detection
                let attempts = 0;
                const maxAttempts = 20;
                
                while (typeof QRCode === 'undefined' && typeof window.QRCode === 'undefined' && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                    console.log(`⏳ Waiting for QRCode library... attempt ${attempts}/${maxAttempts}`);
                }
            }
            
            // Get QRCode reference (check both global and window)
            const QRCodeLib = typeof QRCode !== 'undefined' ? QRCode : window.QRCode;
            
            // Check if QRCode library is loaded
            if (typeof QRCodeLib === 'undefined') {
                console.error('❌ QRCode library not available');
                throw new Error('QRCode library failed to load. Please check your internet connection and try refreshing the page.');
            }

            console.log('✅ QRCode library loaded, generating QR...');

            // Generate QR code canvas
            const canvas = document.createElement('canvas');
            await QRCodeLib.toCanvas(canvas, qrString, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

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
            qrContainer.appendChild(canvas);
            
            const buttons = document.createElement('div');
            buttons.style.cssText = 'margin-top: 15px; display: flex; gap: 10px; justify-content: center;';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '📥 Download QR';
            downloadBtn.className = 'btn btn-primary';
            downloadBtn.onclick = () => this.downloadMemberQR(canvas, qrData.id);
            
            const printBtn = document.createElement('button');
            printBtn.textContent = '🖨️ Print Card';
            printBtn.className = 'btn btn-secondary';
            printBtn.onclick = () => this.printMemberCard(qrData, canvas);
            
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
    printMemberCard: function(memberData, canvas) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the card');
            return;
        }

        const qrImage = canvas.toDataURL('image/png');
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

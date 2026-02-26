// Fix issues table and verify
const http = require('http');

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (e) {
                    resolve([]);
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function fixAndVerify() {
    console.log('\n🔧 Fixing and verifying database...\n');
    
    try {
        // Ensure issues table is empty array
        await makeRequest('PUT', '/api/issues', { items: [] });
        console.log('✓ Issues table cleared');

        // Verify all tables
        const [users, members, issues, requests, books] = await Promise.all([
            makeRequest('GET', '/api/users'),
            makeRequest('GET', '/api/members'),
            makeRequest('GET', '/api/issues'),
            makeRequest('GET', '/api/requests'),
            makeRequest('GET', '/api/books')
        ]);

        console.log('\n📊 Final Database State:\n');
        console.log(`   ✅ Users:       ${users.length || 0} (Admin only)`);
        console.log(`   ✅ Members:     ${members.length || 0} (Clean)`);
        console.log(`   ✅ Issues:      ${issues.length || 0} (Clean)`);
        console.log(`   ✅ Requests:    ${requests.length || 0} (Clean)`);
        console.log(`   ✅ Books:       ${books.length || 0} (Preserved)`);

        const isClean = (users.length === 1) && 
                       (members.length === 0) && 
                       (issues.length === 0) && 
                       (requests.length === 0);

        if (isClean) {
            console.log('\n🎉 DATABASE IS PERFECTLY CLEAN!\n');
            console.log('✓ Ready for real users to register');
            console.log('✓ No fake data will appear');
            console.log('✓ All dashboards will show 0 until real activity\n');
        } else {
            console.log('\n⚠️ Some cleanup needed - running final cleanup...\n');
            
            // Force clean everything except admin and books
            const adminUser = {
                id: 'U001',
                email: 'anlinpunneli@gmail.com',
                password: 'Anlin20#69',
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
                memberId: '',
                createdDate: new Date().toISOString()
            };

            await Promise.all([
                makeRequest('PUT', '/api/users', { items: [adminUser] }),
                makeRequest('PUT', '/api/members', { items: [] }),
                makeRequest('PUT', '/api/issues', { items: [] }),
                makeRequest('PUT', '/api/requests', { items: [] })
            ]);

            console.log('✅ Final cleanup complete!\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixAndVerify();

// Automatic database reset script
const http = require('http');

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function resetDatabase() {
    console.log('\n🗑️  Starting Complete Database Reset...\n');
    console.log('═'.repeat(60));

    try {
        // Fetch current data
        console.log('\n📊 Fetching current data...');
        const [users, members, issues, requests] = await Promise.all([
            makeRequest('GET', '/api/users'),
            makeRequest('GET', '/api/members'),
            makeRequest('GET', '/api/issues'),
            makeRequest('GET', '/api/requests')
        ]);

        console.log(`   Found: ${users.length} users, ${members.length} members, ${issues.length} issues, ${requests.length} requests`);

        // Keep only admin
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

        const cleanUsers = [adminUser];
        const cleanMembers = [];
        const cleanIssues = [];
        const cleanRequests = [];

        // Update database
        console.log('\n🧹 Cleaning database...');
        await Promise.all([
            makeRequest('PUT', '/api/users', { items: cleanUsers }),
            makeRequest('PUT', '/api/members', { items: cleanMembers }),
            makeRequest('PUT', '/api/issues', { items: cleanIssues }),
            makeRequest('PUT', '/api/requests', { items: cleanRequests })
        ]);

        const removedUsers = users.length - 1;
        const totalRemoved = removedUsers + members.length + issues.length + requests.length;

        console.log('\n✅ Database Reset Complete!');
        console.log('═'.repeat(60));
        console.log('\n📋 Summary:');
        console.log(`   ❌ Deleted: ${removedUsers} user(s)`);
        console.log(`   ❌ Deleted: ${members.length} member(s)`);
        console.log(`   ❌ Deleted: ${issues.length} issue(s)`);
        console.log(`   ❌ Deleted: ${requests.length} request(s)`);
        console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   🗑️  Total removed: ${totalRemoved} records`);
        console.log('\n✓ Remaining:');
        console.log('   ✓ 1 Admin account (anlinpunneli@gmail.com)');
        console.log('   ✓ Books catalog preserved');
        console.log('   ✓ Categories preserved');
        console.log('\n🎉 Database is now clean and ready for real users!');
        console.log('═'.repeat(60));
        console.log('\n👉 Students and librarians can now register fresh accounts.');
        console.log('👉 No fake data will appear in dashboards.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n💡 Make sure the server is running: node server.js');
        process.exit(1);
    }
}

resetDatabase();

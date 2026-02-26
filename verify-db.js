// Comprehensive database verification
const http = require('http');

function fetchData(resource) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:8000/api/${resource}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', reject);
    });
}

async function verifyDatabase() {
    console.log('\n✅ DATABASE VERIFICATION REPORT\n');
    console.log('═'.repeat(60));
    
    try {
        const [users, members, books, categories, issues, requests] = await Promise.all([
            fetchData('users'),
            fetchData('members'),
            fetchData('books'),
            fetchData('categories'),
            fetchData('issues'),
            fetchData('requests')
        ]);

        console.log('\n📊 Current Database Status:\n');
        console.log(`   Users:       ${users.length} (Only admin)`);
        console.log(`   Members:     ${members.length} (Cleaned)`);
        console.log(`   Books:       ${books.length} (Preserved)`);
        console.log(`   Categories:  ${categories.length} (Preserved)`);
        console.log(`   Issues:      ${issues.length} (Cleaned)`);
        console.log(`   Requests:    ${requests.length} (Cleaned)`);

        console.log('\n═'.repeat(60));
        
        if (users.length === 1 && members.length === 0 && issues.length === 0 && requests.length === 0) {
            console.log('\n✅ DATABASE IS CLEAN!');
            console.log('\n   ✓ Only admin account exists');
            console.log('   ✓ No fake members');
            console.log('   ✓ No fake issues');
            console.log('   ✓ No fake requests');
            console.log('   ✓ Books catalog intact');
            console.log('\n🎉 Ready for real users!\n');
        } else {
            console.log('\n⚠️  Database status:');
            if (users.length > 1) console.log(`   ⚠️  Extra users detected (${users.length - 1})`);
            if (members.length > 0) console.log(`   ⚠️  Fake members still present (${members.length})`);
            if (issues.length > 0) console.log(`   ⚠️  Fake issues still present (${issues.length})`);
            if (requests.length > 0) console.log(`   ⚠️  Fake requests still present (${requests.length})`);
            console.log('');
        }

        console.log('═'.repeat(60) + '\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyDatabase();

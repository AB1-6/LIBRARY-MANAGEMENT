// Quick check of users vs members
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
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log('\n=== CHECKING DATABASE ===\n');
        
        const members = await fetchData('members');
        const users = await fetchData('users');
        
        console.log(`📊 MEMBERS (Library Borrowers): ${members.length}`);
        console.log('─'.repeat(60));
        members.forEach((m, i) => {
            console.log(`${i + 1}. ID: ${m.id} | Name: ${m.name || 'N/A'} | Email: ${m.email || 'N/A'} | Type: ${m.type || 'N/A'}`);
        });
        
        console.log(`\n🔐 USERS (Login Accounts): ${users.length}`);
        console.log('─'.repeat(60));
        users.forEach((u, i) => {
            console.log(`${i + 1}. ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Name: ${u.firstName} ${u.lastName}`);
        });
        
        console.log('\n💡 TIP: Members = people who borrow books, Users = login accounts');
        
    } catch (error) {
        console.error('Error:', error.message);
        console.log('\nMake sure the server is running on http://localhost:8000');
    }
}

main();

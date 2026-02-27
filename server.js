const path = require('path');
const fs = require('fs');
const express = require('express');

function loadLocalEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadLocalEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let sqlite3 = null;
let createClient = null;

if (isSupabaseEnabled) {
  ({ createClient } = require('@supabase/supabase-js'));
} else {
  sqlite3 = require('sqlite3').verbose();
}

const app = express();
const PORT = process.env.PORT || 8000;

const RESOURCE_TABLE = 'entity_resources';

function createSqliteStore() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'entity.db');
  const db = new sqlite3.Database(dbPath);

  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  function all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  return {
    async init() {
      await run('CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await run('CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await run('CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await run('CREATE TABLE IF NOT EXISTS issues (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await run('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      await run('CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
    },
    async count(tableName) {
      const row = await get(`SELECT COUNT(1) as total FROM ${tableName}`);
      return row ? Number(row.total || 0) : 0;
    },
    async replace(tableName, items) {
      await run(`DELETE FROM ${tableName}`);
      for (const item of items) {
        await run(`INSERT INTO ${tableName}(id, data) VALUES(?, ?)`, [item.id, JSON.stringify(item)]);
      }
    },
    async read(tableName) {
      const rows = await all(`SELECT data FROM ${tableName}`);
      return rows.map((row) => JSON.parse(row.data));
    }
  };
}

function createSupabaseStore() {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return {
    async init() {
      const { error } = await client.from(RESOURCE_TABLE).select('resource').limit(1);
      if (error) {
        throw new Error(
          `Supabase table "${RESOURCE_TABLE}" is not ready. Run the SQL in supabase/schema.sql. Original error: ${error.message}`
        );
      }
    },
    async count(resource) {
      const { count, error } = await client
        .from(RESOURCE_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('resource', resource);
      if (error) {
        throw error;
      }
      return Number(count || 0);
    },
    async replace(resource, items) {
      const { error: deleteError } = await client.from(RESOURCE_TABLE).delete().eq('resource', resource);
      if (deleteError) {
        throw deleteError;
      }

      if (!items.length) {
        return;
      }

      const rows = items.map((item) => ({
        resource,
        id: String(item.id),
        data: item
      }));

      const { error: insertError } = await client.from(RESOURCE_TABLE).insert(rows);
      if (insertError) {
        throw insertError;
      }
    },
    async read(resource) {
      const { data, error } = await client
        .from(RESOURCE_TABLE)
        .select('data')
        .eq('resource', resource)
        .order('id', { ascending: true });
      if (error) {
        throw error;
      }
      return (data || []).map((row) => row.data || {});
    }
  };
}

const store = isSupabaseEnabled ? createSupabaseStore() : createSqliteStore();

const tables = {
  books: 'books',
  categories: 'categories',
  members: 'members',
  issues: 'issues',
  users: 'users',
  requests: 'requests',
  wishlist: 'wishlist',
  waitlist: 'waitlist',
  chat: 'chat',
  reviews: 'reviews',
  borrowedHistory: 'borrowedHistory',
  fines: 'fines',
  notifications: 'notifications',
  notificationPreferences: 'notificationPreferences'
};

const seedData = {
  categories: [
    { id: 'CAT001', name: 'Computer Science', description: 'Books about computer science and technology' },
    { id: 'CAT002', name: 'Programming', description: 'Programming languages and techniques' },
    { id: 'CAT003', name: 'Software Engineering', description: 'Software development methodologies' },
    { id: 'CAT004', name: 'Data Science', description: 'Data analysis and machine learning' },
    { id: 'CAT005', name: 'Web Development', description: 'Frontend and backend web technologies' }
  ],
  books: [
    { id: 'B001', title: 'Introduction to Algorithms', author: 'Cormen', category: 'Computer Science', totalCopies: 3, availableCopies: 3, isbn: '9780262033848', publisher: 'MIT Press', publicationYear: 2009 },
    { id: 'B002', title: 'Clean Code', author: 'Robert Martin', category: 'Programming', totalCopies: 2, availableCopies: 2, isbn: '9780132350884', publisher: 'Prentice Hall', publicationYear: 2008 },
    { id: 'B003', title: 'Design Patterns', author: 'Gang of Four', category: 'Software Engineering', totalCopies: 1, availableCopies: 1, isbn: '9780201633610', publisher: 'Addison-Wesley', publicationYear: 1994 },
    { id: 'B004', title: 'The Pragmatic Programmer', author: 'Hunt and Thomas', category: 'Programming', totalCopies: 2, availableCopies: 2, isbn: '9780135957059', publisher: 'Addison-Wesley', publicationYear: 2019 },
    { id: 'B005', title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', category: 'Web Development', totalCopies: 3, availableCopies: 3, isbn: '9780596517748', publisher: "O'Reilly", publicationYear: 2008 },
    { id: 'B006', title: 'Python Crash Course', author: 'Eric Matthes', category: 'Programming', totalCopies: 2, availableCopies: 2, isbn: '9781593279288', publisher: 'No Starch Press', publicationYear: 2019 },
    { id: 'B007', title: 'Data Science from Scratch', author: 'Joel Grus', category: 'Data Science', totalCopies: 2, availableCopies: 2, isbn: '9781492041139', publisher: "O'Reilly", publicationYear: 2019 },
    { id: 'B008', title: 'The Mythical Man-Month', author: 'Frederick Brooks', category: 'Software Engineering', totalCopies: 1, availableCopies: 1, isbn: '9780201835953', publisher: 'Addison-Wesley', publicationYear: 1995 },
    { id: 'B009', title: 'Head First Design Patterns', author: 'Freeman & Freeman', category: 'Software Engineering', totalCopies: 2, availableCopies: 2, isbn: '9780596007126', publisher: "O'Reilly", publicationYear: 2004 },
    { id: 'B010', title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', category: 'Web Development', totalCopies: 2, availableCopies: 2, isbn: '9781593279509', publisher: 'No Starch Press', publicationYear: 2018 }
  ],
  members: [
    { id: 'M001', name: 'John Doe', email: 'john@example.com', phone: '1234567890', address: '123 Main St', joinDate: new Date().toISOString() },
    { id: 'M002', name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321', address: '456 Oak Ave', joinDate: new Date().toISOString() },
    { id: 'M003', name: 'Bob Johnson', email: 'bob@example.com', phone: '5555555555', address: '789 Pine Rd', joinDate: new Date().toISOString() }
  ],
  users: [
    {
      id: 'U001',
      email: 'anlinpunneli@gmail.com',
      password: 'Anlin20#69',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      memberId: '',
      createdDate: new Date().toISOString()
    }
    // U002 fake librarian removed - create real librarians from admin panel
  ],
  issues: [],
  requests: [],
  wishlist: [],
  waitlist: [],
  chat: [],
  reviews: [],
  borrowedHistory: [],
  fines: [],
  notifications: [],
  notificationPreferences: []
};

async function replaceTable(tableName, items) {
  await store.replace(tableName, items);
}

async function readTable(tableName) {
  return store.read(tableName);
}

async function ensureSeeded() {
  for (const [resource, tableName] of Object.entries(tables)) {
    const total = await store.count(tableName);
    if (total === 0) {
      await replaceTable(tableName, seedData[resource] || []);
    }
  }
}

async function getSnapshot() {
  const snapshot = {};
  for (const [resource, tableName] of Object.entries(tables)) {
    snapshot[resource] = await readTable(tableName);
  }
  return snapshot;
}

function nextId(prefix, items) {
  let max = 0;
  for (const item of items) {
    const id = String(item.id || '');
    if (id.startsWith(prefix)) {
      const num = parseInt(id.slice(prefix.length), 10);
      if (!Number.isNaN(num)) {
        max = Math.max(max, num);
      }
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

app.use(express.json());
app.use(express.static(__dirname));

let startupPromise = null;

// Cleanup function to trim whitespace from existing user data
async function cleanupUserData() {
  try {
    const users = await readTable('users');
    let updated = false;
    
    const cleanedUsers = users.map(user => {
      const needsCleaning = 
        user.email !== user.email.trim() || 
        user.password !== user.password.trim() ||
        (user.firstName && user.firstName !== user.firstName.trim()) ||
        (user.lastName && user.lastName !== user.lastName.trim());
      
      if (needsCleaning) {
        updated = true;
        return {
          ...user,
          email: user.email.trim(),
          password: user.password.trim(),
          firstName: user.firstName ? user.firstName.trim() : user.firstName,
          lastName: user.lastName ? user.lastName.trim() : user.lastName
        };
      }
      return user;
    });
    
    if (updated) {
      await replaceTable('users', cleanedUsers);
      console.log('User data cleanup completed - trimmed whitespace from credentials');
    }
  } catch (error) {
    console.error('User data cleanup failed:', error);
  }
}

async function ensureStartup() {
  if (!startupPromise) {
    startupPromise = (async () => {
      try {
        await store.init();
        await ensureSeeded();
        await cleanupUserData();
        console.log('✓ Server initialized successfully');
      } catch (error) {
        console.warn('STARTUP WARNING:', error.message || error);
        console.log('⚠ Server will continue in fallback mode (localStorage/memory)');
        // Don't throw - allow server to continue without Supabase
      }
    })();
  }
  return startupPromise;
}

app.get('/api/debug', async (req, res) => {
  try {
    // Test store init
    await store.init();
    res.json({ 
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      isSupabaseEnabled,
      storeInitSuccess: true,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    res.json({ 
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      isSupabaseEnabled,
      storeInitSuccess: false,
      error: error.message,
      nodeEnv: process.env.NODE_ENV
    });
  }
});

app.use(async (req, res, next) => {
  try {
    await ensureStartup();
    next();
  } catch (error) {
    console.error('Startup failed', error);
    res.status(500).json({ error: 'Server initialization failed.' });
  }
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/init', async (req, res) => {
  try {
    await ensureSeeded();
    const snapshot = await getSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize data.' });
  }
});

app.get('/api/:resource', async (req, res) => {
  const { resource } = req.params;
  const tableName = tables[resource];
  if (!tableName) {
    res.status(404).json({ error: 'Unknown resource.' });
    return;
  }

  try {
    const items = await readTable(tableName);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read resource.' });
  }
});

app.put('/api/:resource', async (req, res) => {
  const { resource } = req.params;
  const tableName = tables[resource];
  if (!tableName) {
    res.status(404).json({ error: 'Unknown resource.' });
    return;
  }

  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Body must include array field: items.' });
    return;
  }

  try {
    await replaceTable(tableName, items);
    res.json({ success: true, count: items.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update resource.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  // Trim email and password to avoid whitespace issues
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  try {
    const users = await readTable('users');
    const members = await readTable('members');
    const user = users.find((entry) => entry.email.trim() === trimmedEmail && entry.password.trim() === trimmedPassword);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const effectiveRole = user.role || role || 'student';
    const member = user.memberId ? members.find((m) => m.id === user.memberId) : members.find((m) => m.email.trim() === trimmedEmail);

    res.json({
      id: user.id,
      email: user.email,
      role: effectiveRole,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      memberId: member ? member.id : user.memberId || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, password, studentId } = req.body || {};
  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  // Trim all fields to avoid whitespace issues
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  try {
    const users = await readTable('users');
    const members = await readTable('members');

    const existing = users.find((entry) => entry.email.trim() === trimmedEmail);
    if (existing) {
      res.status(409).json({ error: 'Email already exists.' });
      return;
    }

    // Auto-generate student ID in ENT#### format
    let maxNum = 0;
    members.forEach((member) => {
      const id = member.id || '';
      if (id.startsWith('ENT')) {
        const num = parseInt(id.substring(3), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const autoStudentId = 'ENT' + String(maxNum + 1).padStart(4, '0');

    const newMember = {
      id: autoStudentId,
      name: `${trimmedFirstName} ${trimmedLastName}`,
      email: trimmedEmail,
      phone: '',
      type: 'Student'
    };

    const newUser = {
      id: nextId('U', users),
      email: trimmedEmail,
      password: trimmedPassword,
      role: 'student',
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      memberId: newMember.id,
      createdDate: new Date().toISOString()
    };

    members.push(newMember);
    users.push(newUser);

    await replaceTable('members', members);
    await replaceTable('users', users);

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      memberId: newUser.memberId,
      firstName: newUser.firstName,
      lastName: newUser.lastName
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

async function start() {
  try {
    await ensureStartup();
  } catch (error) {
    console.warn('Startup had errors but continuing:', error.message || error);
  }

  app.listen(PORT, () => {
    const mode = isSupabaseEnabled ? 'Supabase' : 'Fallback';
    console.log(`🚀 ENTITY server running at http://localhost:${PORT} (${mode} mode)`);
    console.log(`📍 Visit: http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}

module.exports = app;

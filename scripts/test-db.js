// Test TiDB connection
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testConnection() {
  const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl: {
      rejectUnauthorized: true,
    },
    connectionLimit: 1,
  });

  try {
    console.log('Testing TiDB connection...');
    const [rows] = await pool.execute('SELECT 1 + 1 AS result');
    console.log('✅ Connection successful!');
    console.log('Test query result:', rows);

    // Check if tables exist
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('\n📊 Tables in database:');
    console.log(tables);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();

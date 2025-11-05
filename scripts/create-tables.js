// Script to create TiDB tables
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createTables() {
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
    multipleStatements: true,
  });

  try {
    console.log('🔌 Connecting to TiDB...');

    // Read the schema file
    const schemaPath = path.join(__dirname, '../lib/db/schema-tidb-serverless.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and filter out empty statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().includes('create table')) {
        const tableName = statement.match(/create table if not exists (\w+)/i)?.[1];
        console.log(`Creating table: ${tableName}...`);
        try {
          await pool.execute(statement);
          console.log(`✅ Created table: ${tableName}`);
        } catch (error) {
          console.error(`❌ Failed to create table ${tableName}:`, error.message);
        }
      }
    }

    console.log('\n📊 Checking tables...');
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables in database:');
    console.log(tables);

    await pool.end();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTables();

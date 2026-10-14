require('dotenv').config({ path: './.env' });
const db = require('./config/db');

async function run() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    let schemaInfo = '';
    
    for (const tableName of tableNames) {
      schemaInfo += 'Table: ' + tableName + '\n';
      const [columns] = await db.query('SHOW COLUMNS FROM ' + tableName);
      columns.forEach(col => {
        schemaInfo += '  - ' + col.Field + ' (' + col.Type + ')' + (col.Key === 'PRI' ? ' [PK]' : '') + (col.Key === 'MUL' ? ' [FK]' : '') + '\n';
      });
      
      const [fks] = await db.query(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}' AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      if (fks.length > 0) {
        schemaInfo += '  Foreign Keys:\n';
        fks.forEach(fk => {
          schemaInfo += '    - ' + fk.COLUMN_NAME + ' -> ' + fk.REFERENCED_TABLE_NAME + '(' + fk.REFERENCED_COLUMN_NAME + ')\n';
        });
      }
      schemaInfo += '\n';
    }
    
    const fs = require('fs');
    fs.writeFileSync('schema_output.txt', schemaInfo);
    console.log('Schema saved to schema_output.txt');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
run();

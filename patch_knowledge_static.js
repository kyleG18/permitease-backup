const fs = require('fs');
const path = './backend/server.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  '// Removed static serving of /uploads to protect sensitive documents',
  '// Sensitive documents are protected. Only Knowledge Base files (public FAQs/Guides) are statically served.\napp.use(\'/uploads/knowledge\', express.static(path.join(__dirname, \'uploads/knowledge\')));'
);

fs.writeFileSync(path, c);
console.log('Patched server.js for knowledge base');

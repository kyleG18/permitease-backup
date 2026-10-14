const fs = require('fs');
const path = './server.js';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('/api/locations')) {
  content = content.replace("app.use('/api/auth', require('./routes/authRoutes'));", 
    "app.use('/api/auth', require('./routes/authRoutes'));\napp.use('/api/locations', require('./routes/locationRoutes'));");
  fs.writeFileSync(path, content);
  console.log('Added /api/locations to server.js');
}

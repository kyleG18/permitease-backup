const fs = require('fs');
const path = './backend/controllers/dashboardController.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('    catch (error)', '} catch (error)');
fs.writeFileSync(path, content);
console.log('Fixed syntax error');

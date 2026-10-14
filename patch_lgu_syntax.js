const fs = require('fs');
const path = './frontend/src/pages/LGUApplicationReview.jsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
`              ))}
            </div>
            )}
          </div>`,
`              ))}
            </div>
          </div>`
);

fs.writeFileSync(path, c);
console.log('Fixed syntax error in LGUApplicationReview.jsx');

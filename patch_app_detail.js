const fs = require('fs');
const path = './frontend/src/pages/ApplicationDetail.jsx';
let c = fs.readFileSync(path, 'utf8');

const downloadFn = `
  const handleDownload = async (docId, docName) => {
    try {
      const res = await fetch(\`\${API}/documents/download/\${docId}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (!res.ok) {
        alert('Failed to download document.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document.');
    }
  };
`;

if (!c.includes('handleDownload(')) {
  c = c.replace('const [error, setError] = useState(\'\');', 'const [error, setError] = useState(\'\');' + downloadFn);
}

c = c.replace(
  /<a href={`http:\/\/localhost:5000\/uploads\/\${doc\.file_path}`} target="_blank" rel="noreferrer"/g,
  '<button onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name); }}'
);

c = c.replace(
  /textDecoration: 'none' }}>View<\/a>/g,
  'textDecoration: \'none\', background: \'none\', border: \'none\', cursor: \'pointer\', padding: 0 }}>View</button>'
);

fs.writeFileSync(path, c);
console.log('Patched ApplicationDetail.jsx');

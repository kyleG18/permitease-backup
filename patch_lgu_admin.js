const fs = require('fs');
const path = './frontend/src/pages/LGUApplicationReview.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add resolvedLocation state
if (!content.includes('resolvedLocation')) {
    content = content.replace(
        "const [actionLoading, setActionLoading] = useState(false);",
        "const [actionLoading, setActionLoading] = useState(false);\n  const [resolvedLocation, setResolvedLocation] = useState(null);"
    );
}

// 2. Fetch location names in load()
const oldLoad = `.then(data => { if (data.message && !data.id) { setError(data.message); } else { setApp(data); } setLoading(false); })`;
const newLoad = `.then(async data => { 
          if (data.message && !data.id) { 
            setError(data.message); 
            setLoading(false); 
          } else { 
            setApp(data); 
            if (data.island_group_id) {
                try {
                  const locRes = await fetch(\`\${API}/locations/resolve?islandGroup=\${data.island_group_id}&region=\${data.region_id}&province=\${data.province_id || ''}&city=\${data.city_municipality_id}&barangay=\${data.barangay_id}\`);
                  const locData = await locRes.json();
                  setResolvedLocation(locData);
                } catch(e){}
            }
            setLoading(false); 
          } 
        })`;
if (!content.includes('setResolvedLocation(')) {
    content = content.replace(oldLoad, newLoad);
}

// 3. Update the display array
const oldArray = `[
                  { label: 'Business Name', value: app.business_name },
                  { label: 'Business Type', value: app.business_type },
                  { label: 'Industry', value: app.industry_category },
                  { label: 'Address', value: app.address },
                  { label: 'Owner', value: app.owner_name },
                  { label: 'Email', value: app.owner_email },
                  { label: 'Contact', value: app.owner_contact || '—' },
                  { label: 'Employees', value: app.employees },
                  { label: 'Capitalization', value: app.capitalization ? \`?\${Number(app.capitalization).toLocaleString()}\` : '—' },
                  { label: 'Gross Sales', value: app.gross_sales ? \`?\${Number(app.gross_sales).toLocaleString()}\` : '—' },
                ]`;

const newArray = `(() => {
                  let chars = '';
                  if (app.business_characteristics) {
                      try {
                          const c = typeof app.business_characteristics === 'string' ? JSON.parse(app.business_characteristics) : app.business_characteristics;
                          chars = Object.entries(c).map(([k,v]) => \`\${k.replace('_',' ')}: \${v}\`).join(', ');
                      } catch(e){}
                  }
                  
                  const fullAddress = resolvedLocation ? 
                      \`\${app.address}, \${resolvedLocation.barangay}, \${resolvedLocation.city}, \${resolvedLocation.province ? resolvedLocation.province + ', ' : ''}\${resolvedLocation.region}\` : 
                      app.address;

                  return [
                    { label: 'Business Name', value: app.business_name },
                    { label: 'Ownership Type', value: app.ownership_type || '—' },
                    { label: 'Business Type', value: app.business_type },
                    { label: 'Industry Category', value: app.industry_category },
                    { label: 'Primary Products', value: app.primary_products || '—' },
                    { label: 'Address', value: fullAddress },
                    { label: 'Premises Type', value: app.premises_type || '—' },
                    { label: 'Characteristics', value: chars || '—' },
                    { label: 'Owner', value: app.owner_name },
                    { label: 'Email', value: app.owner_email },
                    { label: 'Contact', value: app.owner_contact || '—' },
                    { label: 'Employees', value: app.employees },
                    { label: 'Capitalization', value: app.capitalization ? \`?\${Number(app.capitalization).toLocaleString()}\` : '—' },
                    { label: 'Gross Sales', value: app.gross_sales ? \`?\${Number(app.gross_sales).toLocaleString()}\` : '—' },
                  ];
                })()`;

if (!content.includes('resolvedLocation ?')) {
    content = content.replace(oldArray, newArray);
    fs.writeFileSync(path, content);
    console.log('Patched LGUApplicationReview.jsx');
} else {
    console.log('Already patched');
}

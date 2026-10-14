const fs = require('fs');
const path = './frontend/src/pages/Onboarding.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add resolvedNames state
if (!content.includes('resolvedNames')) {
    content = content.replace(
        "const [locations, setLocations] = useState({", 
        "const [resolvedNames, setResolvedNames] = useState(null);\n  const [locations, setLocations] = useState({"
    );
}

// 2. Add useEffect to fetch resolved names when reaching step 4
const hookInjection = `  // Resolve names for Step 4
  useEffect(() => {
    if (step === 4) {
      const fetchResolvedNames = async () => {
        try {
          const res = await axios.get(\`\${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/locations/resolve?islandGroup=\${formData.island_group_id}&region=\${formData.region_id}&province=\${formData.province_id}&city=\${formData.city_municipality_id}&barangay=\${formData.barangay_id}\`);
          setResolvedNames(res.data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchResolvedNames();
    }
  }, [step, formData]);`;

if (!content.includes('Resolve names for Step 4')) {
    content = content.replace(
        "// Load Island Groups initially",
        hookInjection + "\n\n  // Load Island Groups initially"
    );
}

// 3. Replace the display in step 4
const oldDisplay = `{getLocName(locations.barangays, formData.barangay_id)}, {getLocName(locations.cities, formData.city_municipality_id)}<br/>
                          {getLocName(locations.provinces, formData.province_id)}, {getLocName(locations.regions, formData.region_id)}<br/>
                          Philippines`;
const oldDisplay2 = `{getLocName(locations.provinces, formData.province_id)}, {getLocName(locations.regions, formData.region_id)}<br/>`;

if (content.includes('getLocName(locations.barangays')) {
    const newDisplay = `{resolvedNames ? (
                            <>
                              {resolvedNames.barangay}, {resolvedNames.city}<br/>
                              {resolvedNames.province ? \`\${resolvedNames.province}, \` : ''}{resolvedNames.region}<br/>
                              Philippines
                            </>
                          ) : (
                            'Loading location details...'
                          )}`;
    content = content.replace(
`                        <strong>
                          {getLocName(locations.barangays, formData.barangay_id)}, {getLocName(locations.cities, formData.city_municipality_id)}<br/>
                          {getLocName(locations.provinces, formData.province_id)}, {getLocName(locations.regions, formData.region_id)}<br/>
                          Philippines
                        </strong>`,
`                        <strong>
                          ${newDisplay}
                        </strong>`
    );
    
    // Also fix the preview banner in step 2/3
    const oldBanner = `{getLocName(locations.barangays, formData.barangay_id)}, {getLocName(locations.cities, formData.city_municipality_id)}, {getLocName(locations.provinces, formData.province_id)}, {getLocName(locations.regions, formData.region_id)}`;
    
    const newBanner = `{getLocName(locations.barangays, formData.barangay_id)}, {getLocName(locations.cities, formData.city_municipality_id)}, {formData.province_id ? getLocName(locations.provinces, formData.province_id) + ', ' : ''}{getLocName(locations.regions, formData.region_id)}`;
    content = content.replace(oldBanner, newBanner);

    fs.writeFileSync(path, content);
    console.log('Patched Onboarding.jsx review step to use resolved names');
} else {
    console.log('Already patched?');
}

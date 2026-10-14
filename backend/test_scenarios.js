const db = require('./config/db');
const { generateFeeEstimate, generateStructuredAssessment } = require('./services/aiService');

const TARGET_LGU = '175212000'; // Municipality of Roxas, Oriental Mindoro

async function runTests() {
  const scenarios = [
    {
      name: 'Scenario 1: Roxas, Oriental Mindoro (SHOULD support)',
      business: { business_name: 'Test Store', business_type: 'Retail', business_status: 'New Application', capitalization: 50000, city_municipality_id: '175212000' }
    },
    {
      name: 'Scenario 2: Roxas City, Capiz (SHOULD NOT activate Roxas OM rules)',
      business: { business_name: 'Test Store', business_type: 'Retail', business_status: 'New Application', capitalization: 50000, city_municipality_id: '196003000' }
    },
    {
      name: 'Scenario 3: NCR - Quezon City (SHOULD NOT support, and province was skipped)',
      business: { business_name: 'Test Store', business_type: 'Retail', business_status: 'New Application', capitalization: 50000, city_municipality_id: '137404000', province_id: null }
    },
    {
      name: 'Scenario 4: Calamba, Laguna (SHOULD NOT support)',
      business: { business_name: 'Test Store', business_type: 'Retail', business_status: 'New Application', capitalization: 50000, city_municipality_id: '042110000' }
    }
  ];

  console.log('\n=== LGU DETECTION & SHORT-CIRCUIT TESTS ===\n');

  for (const s of scenarios) {
    console.log('---');
    console.log(s.name);
    console.log('city_municipality_id:', s.business.city_municipality_id);
    
    const isSupported = s.business.city_municipality_id === TARGET_LGU;
    console.log('Correctly identified as supported LGU:', isSupported);
    
    // Test fee short-circuit
    const feeResult = await generateFeeEstimate(s.business, []);
    
    if (isSupported) {
      // For supported, it will try to call AI and probably fail (no API key check or empty rules)
      // but the key thing is supportedLGU should NOT be false
      console.log('Fee result supportedLGU:', feeResult.supportedLGU !== false ? 'NOT set to false (correct - passed to AI)' : 'WRONG - false for supported LGU');
    } else {
      console.log('Fee result supportedLGU:', feeResult.supportedLGU === false ? 'false (CORRECT)' : 'WRONG - should be false');
      console.log('Fee result estimatedTax:', feeResult.estimatedTax === null ? 'null (CORRECT - not zero)' : 'WRONG: ' + feeResult.estimatedTax);
      console.log('Fee result estimatedFees:', feeResult.estimatedFees === null ? 'null (CORRECT - not zero)' : 'WRONG: ' + feeResult.estimatedFees);
      console.log('Fee result total_estimated_amount:', feeResult.total_estimated_amount === null ? 'null (CORRECT - not zero)' : 'WRONG: ' + feeResult.total_estimated_amount);
      console.log('Fee summary:', feeResult.summary.substring(0, 80) + '...');
    }
    console.log('');
  }

  // Verify Roxas City Capiz ID is different from Roxas OM
  console.log('=== PSGC ID VERIFICATION ===');
  const [roxasOM] = await db.query("SELECT id, name, province_id FROM ph_cities_municipalities WHERE id = '175212000'");
  const [roxasCapiz] = await db.query("SELECT id, name, province_id FROM ph_cities_municipalities WHERE id = '196003000'");
  const [calambaLaguna] = await db.query("SELECT id, name, province_id FROM ph_cities_municipalities WHERE id = '042110000'");
  const [qcNCR] = await db.query("SELECT id, name, province_id FROM ph_cities_municipalities WHERE id = '137404000'");
  
  console.log('Roxas, Oriental Mindoro:', roxasOM[0] || 'NOT FOUND');
  console.log('Roxas City, Capiz:', roxasCapiz[0] || 'NOT FOUND - check PSGC code');
  console.log('Calamba, Laguna:', calambaLaguna[0] || 'NOT FOUND - check PSGC code');
  console.log('Quezon City, NCR:', qcNCR[0] || 'NOT FOUND - check PSGC code');

  // Also test NCR province skip - find NCR cities with no province_id
  const [ncrCities] = await db.query("SELECT id, name, province_id FROM ph_cities_municipalities WHERE region_id = '130000000' AND province_id IS NULL LIMIT 5");
  console.log('\nNCR cities with null province_id (province skip scenario):', ncrCities.length > 0 ? ncrCities.map(c => c.name).join(', ') : 'NONE FOUND - check seeding');

  process.exit(0);
}

runTests().catch(e => { console.error(e); process.exit(1); });

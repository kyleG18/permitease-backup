const db = require('./config/db');
const { generateFeeEstimate } = require('./services/aiService');

const TARGET_LGU = '175212000'; // Municipality of Roxas, Oriental Mindoro

async function runTests() {
  const scenarios = [
    { name: 'Scenario 1: Roxas, Oriental Mindoro',      id: '175212000', expectSupported: true  },
    { name: 'Scenario 2: City of Roxas, Capiz',         id: '061914000', expectSupported: false },
    { name: 'Scenario 3: NCR - Quezon City',            id: '137404000', expectSupported: false },
    { name: 'Scenario 4: City of Calamba, Laguna',      id: '043405000', expectSupported: false }
  ];

  console.log('\n=== FOUR SCENARIO VALIDATION ===\n');
  let allPassed = true;

  for (const s of scenarios) {
    const isSupported = s.id === TARGET_LGU;
    const biz = { business_name: 'Test', business_type: 'Retail', business_status: 'New Application', capitalization: 50000, city_municipality_id: s.id };
    const result = await generateFeeEstimate(biz, []);

    const PSGC_CORRECT = (isSupported === s.expectSupported);
    const FEE_CORRECT = s.expectSupported
      ? result.supportedLGU !== false
      : (result.supportedLGU === false && result.estimatedTax === null && result.estimatedFees === null && result.total_estimated_amount === null);

    const pass = PSGC_CORRECT && FEE_CORRECT;
    if (!pass) allPassed = false;

    console.log((pass ? '? PASS' : '? FAIL'), s.name);
    console.log('   PSGC ID:', s.id);
    console.log('   Expected supported:', s.expectSupported, '| Detected:', isSupported);
    if (!s.expectSupported) {
      console.log('   supportedLGU:', result.supportedLGU, '| estimatedTax:', result.estimatedTax, '| total:', result.total_estimated_amount);
    }
    console.log('');
  }

  console.log('=== NCR Province-Skip Check ===');
  const [ncrCities] = await db.query("SELECT name, province_id FROM ph_cities_municipalities WHERE region_id = '130000000' LIMIT 3");
  ncrCities.forEach(c => {
    const skip = c.province_id === null;
    console.log((skip ? '?' : '?'), c.name, '- province_id:', c.province_id, skip ? '(province correctly NULL)' : '(HAS province)');
  });

  console.log('\n' + (allPassed ? '? ALL SCENARIOS PASSED' : '? SOME SCENARIOS FAILED'));
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(e => { console.error(e.message); process.exit(1); });

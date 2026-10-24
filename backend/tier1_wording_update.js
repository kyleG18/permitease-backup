require('dotenv').config();
const db = require('./config/db');

async function run() {
  // ── Tier 1A: CENRO Environmental Clearance → ESO Certificate ──────────────
  // Charter source: "ESO Certificate" issued by "Environment and Sanitation Office / BOSS"
  // Change is label + description clarification only. ID, condition logic, is_mandatory unchanged.
  await db.query(
    'UPDATE permit_requirements SET permit_name = ?, description = ? WHERE id = 10',
    [
      'ESO Certificate',
      'Certificate issued by the municipal Environment and Sanitation Office (ESO) at the Business One Stop Shop (BOSS). Required for environmental compliance and solid waste management. The Roxas Citizen\'s Charter lists this requirement as the "ESO Certificate" issued by the Environment and Sanitation Office.'
    ]
  );

  // ── Tier 1B: Building Permit → Building Permit / Occupancy Permit ──────────
  // Charter source: "Building Permit / Occupancy Permit" issued by "Municipal Engineering Office / BOSS"
  // Charter renewal condition: "if there is an improvement on the structure"
  // Note: Description clarifies both new-build and occupancy scenarios without asserting that
  // a lessor's Certificate of Occupancy always satisfies the requirement.
  await db.query(
    'UPDATE permit_requirements SET permit_name = ?, description = ? WHERE id = 11',
    [
      'Building Permit / Occupancy Permit',
      'Required for new business applications. Issued by the Municipal Engineering Office (MEO). For new constructions, a Building Permit is required. For businesses occupying an existing structure, a Certificate of Occupancy (Occupancy Permit) may apply — verify requirements with the MEO or BOSS. On renewal, this is required only if there has been an improvement or modification to the physical structure.'
    ]
  );

  // ── Verify ─────────────────────────────────────────────────────────────────
  const [rows] = await db.query(
    'SELECT id, permit_name, description, condition_field, condition_value, is_mandatory FROM permit_requirements WHERE id IN (10, 11)'
  );
  console.log('Updated records:');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

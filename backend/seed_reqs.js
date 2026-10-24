require('dotenv').config();
const db = require('./config/db');

/**
 * Municipality of Roxas, Oriental Mindoro — Official Citizen's Charter Permit Requirements Seeder
 * Source: https://www.roxasormin.com/citizens-charter/securing-mayor-s-permit-business-permit
 * Governed under: RA 11032 (Ease of Doing Business Act) & Revised Revenue Code of 2019
 */
async function run() {
  const roxasCharterRequirements = [
    {
      permit_name: 'Barangay Business Clearance',
      description: "Prerequisite clearance issued by the Office of the Barangay Captain in the barangay where the business is geographically located.",
      applicable_business_type: 'All',
      renewal_period: 'Annual',
      condition_field: 'always',
      condition_value: '',
      is_mandatory: 1,
      required_documents: 'Proof of Business Registration, Contract of Lease or Transfer Certificate of Title'
    },
    {
      permit_name: 'Community Tax Certificate (Cedula)',
      description: 'Proof of local community tax compliance issued by the Municipal Treasurer’s Office or Office of the Barangay Captain.',
      applicable_business_type: 'All',
      renewal_period: 'Annual',
      condition_field: 'always',
      condition_value: '',
      is_mandatory: 1,
      required_documents: 'Valid Government Issued ID, Sworn Statement of Gross Receipts / Financial Statement'
    },
    {
      permit_name: 'Sanitary Permit / Health Certification',
      description: 'Ensures the establishment complies with local health and sanitation standards (PD 856). Issued by the Municipal Health Office (MHO) / Business One Stop Shop (BOSS).',
      applicable_business_type: 'All',
      renewal_period: 'Annual',
      condition_field: 'always',
      condition_value: '',
      is_mandatory: 1,
      required_documents: 'Medical Certificates / Health Cards of Personnel, Water Potability Test'
    },
    {
      permit_name: 'Proof of Business Name Registration (DTI / SEC / CDA)',
      description: 'Certificate of legal business name registration from DTI (Sole Proprietorship), SEC (Corporation / Partnership), or CDA (Cooperative).',
      applicable_business_type: 'All',
      renewal_period: 'One-time',
      condition_field: 'always',
      condition_value: '',
      is_mandatory: 1,
      required_documents: 'DTI Certificate of Registration, SEC Certificate with Articles of Incorporation, or CDA Certificate'
    },
    {
      permit_name: 'Fire Safety Inspection Certificate (FSIC)',
      description: 'Certifies that the establishment is compliant with the Fire Code of the Philippines (RA 9514). Issued by the Bureau of Fire Protection (BFP) / Business One Stop Shop (BOSS).',
      applicable_business_type: 'All',
      renewal_period: 'Annual',
      condition_field: 'always',
      condition_value: '',
      is_mandatory: 1,
      required_documents: 'Fire Extinguisher Official Receipt / Inspection Fee Receipt, Building / Floor Plan'
    },
    {
      permit_name: 'Zoning Compliance / Locational Clearance',
      description: 'Issued by the Municipal Planning and Development Office (MPDO) / Business One Stop Shop (BOSS). Mandatory for new establishments; on renewal, required only if there is an improvement or expansion of the physical structure.',
      applicable_business_type: 'All',
      renewal_period: 'One-time',
      condition_field: 'business_status',
      condition_value: 'New Application',
      is_mandatory: 0,
      required_documents: 'Vicinity Map / Sketch, Site Development Plan, Proof of Property Ownership or Contract of Lease'
    },
    {
      permit_name: 'Building Permit / Occupancy Permit',
      description: 'Verifies structural and engineering code compliance. Issued by the Municipal Engineering Office (MEO) / Office of the Building Official (OBO). For new construction, a Building Permit is required; for occupying existing structures, an Occupancy Permit applies. On renewal, required only if there are structural improvements.',
      applicable_business_type: 'All',
      renewal_period: 'One-time',
      condition_field: 'business_status',
      condition_value: 'New Application',
      is_mandatory: 0,
      required_documents: 'Certificate of Completion / Occupancy, As-Built Building Plans'
    },
    {
      permit_name: 'ESO Certificate',
      description: 'Certificate issued by the Municipal Environment and Sanitation Office (ESO) at the Business One Stop Shop (BOSS). Required for environmental compliance and solid waste management.',
      applicable_business_type: 'All',
      renewal_period: 'Annual',
      condition_field: 'always',
      condition_value: '',
      is_mandatory: 1,
      required_documents: 'Solid Waste Management Plan, Garbage Fee Official Receipt'
    },
    {
      permit_name: 'Tourism Clearance',
      description: 'Mandatory clearance issued by the Municipal Tourism Office for hotels, inns, apartelles, transient lodging, resorts, and tourist-oriented restaurants.',
      applicable_business_type: 'Hotels, Resorts, Restaurants & Tourism',
      renewal_period: 'Annual',
      condition_field: 'industry_category',
      condition_value: 'Tourism',
      is_mandatory: 0,
      required_documents: 'DOT Accreditation Certificate or Municipal Tourism Registration Form'
    },
    {
      permit_name: 'Annual Income Tax Return (AITR)',
      description: 'Mandatory prerequisite for renewal applications to assess gross receipts and local business taxes. Stamped received by the Bureau of Internal Revenue (BIR).',
      applicable_business_type: 'All',
      renewal_period: 'Annual',
      condition_field: 'business_status',
      condition_value: 'Renewal',
      is_mandatory: 0,
      required_documents: 'Previous Year BIR Form 1701 / 1702 with Official Financial Statements'
    }
  ];

  for (const req of roxasCharterRequirements) {
    const [existing] = await db.query('SELECT id FROM permit_requirements WHERE permit_name = ?', [req.permit_name]);
    if (existing.length > 0) {
      await db.query(
        `UPDATE permit_requirements SET description = ?, applicable_business_type = ?, renewal_period = ?, condition_field = ?, condition_value = ?, is_mandatory = ?, required_documents = ? WHERE id = ?`,
        [req.description, req.applicable_business_type, req.renewal_period, req.condition_field, req.condition_value, req.is_mandatory, req.required_documents, existing[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO permit_requirements (permit_name, description, applicable_business_type, renewal_period, condition_field, condition_value, is_mandatory, required_documents) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.permit_name, req.description, req.applicable_business_type, req.renewal_period, req.condition_field, req.condition_value, req.is_mandatory, req.required_documents]
      );
    }
  }
  console.log('Successfully synced Roxas Citizen\'s Charter requirements to permit_requirements table.');
}

run().catch(console.error).finally(() => process.exit(0));

const db = require('./db');
const bcrypt = require('bcryptjs');

const ROXAS_BARANGAYS = [
    { id: '175212001', name: 'Bagumbayan (Pob.)' },
    { id: '175212002', name: 'Cantil' },
    { id: '175212003', name: 'Dangay' },
    { id: '175212004', name: 'Happy Valley' },
    { id: '175212005', name: 'Libertad' },
    { id: '175212006', name: 'Libtong' },
    { id: '175212007', name: 'Mabuhay' },
    { id: '175212008', name: 'Maraska' },
    { id: '175212009', name: 'Odiong' },
    { id: '175212010', name: 'Paclasan (Pob.)' },
    { id: '175212011', name: 'San Aquilino' },
    { id: '175212012', name: 'San Isidro' },
    { id: '175212013', name: 'San Jose' },
    { id: '175212014', name: 'San Mariano' },
    { id: '175212015', name: 'San Miguel' },
    { id: '175212016', name: 'San Rafael' },
    { id: '175212017', name: 'San Vicente' },
    { id: '175212018', name: 'Uyao' },
    { id: '175212019', name: 'Victoria' },
    { id: '175212020', name: 'Little Tanauan' }
];

const ROXAS_REQUIREMENTS = [
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
        description: 'Issued by the Municipal Planning and Development Office (MPDO) / Business One Stop Shop (BOSS). Mandatory for new establishments; on renewal, required only if there is an expansion.',
        applicable_business_type: 'All',
        renewal_period: 'One-time',
        condition_field: 'business_status',
        condition_value: 'New Application',
        is_mandatory: 0,
        required_documents: 'Vicinity Map / Sketch, Site Development Plan, Proof of Property Ownership or Contract of Lease'
    },
    {
        permit_name: 'Building Permit / Occupancy Permit',
        description: 'Verifies structural and engineering code compliance. Issued by the Municipal Engineering Office (MEO) / Office of the Building Official (OBO).',
        applicable_business_type: 'All',
        renewal_period: 'One-time',
        condition_field: 'business_status',
        condition_value: 'New Application',
        is_mandatory: 0,
        required_documents: 'Certificate of Completion / Occupancy, As-Built Building Plans'
    },
    {
        permit_name: 'ESO Certificate',
        description: 'Certificate issued by the Municipal Environment and Sanitation Office (ESO). Required for environmental compliance and solid waste management.',
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

const initDatabase = async () => {
    try {
        console.log('[DB Init] Running full database schema check & bootstrap...');

        // 1. Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                contact_number VARCHAR(50),
                password VARCHAR(255) NOT NULL,
                role ENUM('business_owner', 'lgu_admin', 'system_admin') DEFAULT 'business_owner',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Audit logs table
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                user_name VARCHAR(255),
                user_role VARCHAR(50),
                action VARCHAR(255) NOT NULL,
                details TEXT,
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 3. Businesses table
        await db.query(`
            CREATE TABLE IF NOT EXISTS businesses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                business_name VARCHAR(255) NOT NULL,
                business_type VARCHAR(100) NOT NULL,
                industry_category VARCHAR(100) NOT NULL,
                address TEXT NOT NULL,
                employees INT DEFAULT 0,
                business_status ENUM('New Application', 'Renewal') DEFAULT 'New Application',
                date_established DATE,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                capitalization DECIMAL(15,2) DEFAULT 0.00,
                gross_sales DECIMAL(15,2) DEFAULT 0.00,
                floor_area DECIMAL(10,2) DEFAULT 0.00,
                owner_name VARCHAR(255) DEFAULT NULL,
                contact_number VARCHAR(100) DEFAULT NULL,
                email VARCHAR(255) DEFAULT NULL,
                barangay VARCHAR(100) DEFAULT NULL,
                business_description TEXT,
                ownership_type VARCHAR(100) DEFAULT NULL,
                primary_products TEXT,
                island_group_id VARCHAR(10) DEFAULT NULL,
                region_id VARCHAR(20) DEFAULT NULL,
                province_id VARCHAR(20) DEFAULT NULL,
                city_municipality_id VARCHAR(20) DEFAULT NULL,
                barangay_id VARCHAR(20) DEFAULT NULL,
                premises_type VARCHAR(100) DEFAULT NULL,
                business_characteristics TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 4. Permit requirements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS permit_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                permit_name VARCHAR(255) NOT NULL,
                description TEXT,
                applicable_business_type VARCHAR(255) NOT NULL,
                renewal_period VARCHAR(100) DEFAULT 'Annual',
                required_documents TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                condition_field VARCHAR(100) DEFAULT 'always',
                condition_value VARCHAR(255) DEFAULT '',
                is_mandatory TINYINT(1) DEFAULT 1
            )
        `);

        // 5. Assessments table
        await db.query(`
            CREATE TABLE IF NOT EXISTS assessments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                business_id INT DEFAULT NULL,
                assessment_result TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                compliance_score INT DEFAULT 0,
                readiness_score INT DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            )
        `);

        // 6. Documents table
        await db.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                upload_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                expiration_date DATE DEFAULT NULL,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
            )
        `);

        // 7. Applications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_number VARCHAR(100) UNIQUE,
                user_id INT NOT NULL,
                business_id INT NOT NULL,
                application_type ENUM('NEW', 'RENEWAL') NOT NULL DEFAULT 'NEW',
                status ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
                submitted_at TIMESTAMP NULL DEFAULT NULL,
                reviewed_at TIMESTAMP NULL DEFAULT NULL,
                reviewed_by INT DEFAULT NULL,
                rejection_reason TEXT,
                correction_notes TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 8. Business requirements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS business_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                requirement_id INT NOT NULL,
                document_id INT DEFAULT NULL,
                status ENUM('Missing', 'Submitted', 'Approved', 'Rejected', 'Expired') DEFAULT 'Missing',
                remarks TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_biz_req (business_id, requirement_id),
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (requirement_id) REFERENCES permit_requirements(id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
            )
        `);

        // 9. Permits table
        await db.query(`
            CREATE TABLE IF NOT EXISTS permits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                permit_name VARCHAR(255) NOT NULL,
                permit_number VARCHAR(100) DEFAULT NULL,
                issue_date DATE DEFAULT NULL,
                expiration_date DATE DEFAULT NULL,
                status ENUM('Pending', 'Approved', 'Expired', 'Rejected') DEFAULT 'Pending',
                remarks TEXT,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                application_id INT UNIQUE DEFAULT NULL,
                verification_code VARCHAR(100) UNIQUE DEFAULT NULL,
                pdf_path VARCHAR(255) DEFAULT NULL,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
            )
        `);

        // 10. Tax & fee rules table
        await db.query(`
            CREATE TABLE IF NOT EXISTS tax_fee_rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) NOT NULL,
                basis VARCHAR(50) NOT NULL,
                rate DECIMAL(10,4) DEFAULT 0.0000,
                fixed_amount DECIMAL(15,2) DEFAULT 0.00,
                condition_field VARCHAR(100) DEFAULT 'always',
                condition_value VARCHAR(255) DEFAULT '',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                source_reference VARCHAR(500) DEFAULT NULL,
                verification_status ENUM('verified', 'partially_verified', 'unverified', 'contradicted') NOT NULL DEFAULT 'unverified',
                effective_date DATE DEFAULT NULL,
                notes TEXT
            )
        `);

        // 11. Notifications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('Unread', 'Read') DEFAULT 'Unread',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                event_key VARCHAR(200) UNIQUE DEFAULT NULL,
                type VARCHAR(50) DEFAULT NULL,
                related_application_id INT DEFAULT NULL,
                related_permit_id INT DEFAULT NULL,
                email_sent TINYINT(1) NOT NULL DEFAULT 0,
                email_sent_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 11b. Chat history table
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                question TEXT NOT NULL,
                response LONGTEXT NOT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 11c. Knowledge base table
        await db.query(`
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                document_path VARCHAR(255) NOT NULL,
                uploaded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 11d. Application history table
        await db.query(`
            CREATE TABLE IF NOT EXISTS application_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                actor_user_id INT DEFAULT NULL,
                action VARCHAR(255) NOT NULL,
                old_status VARCHAR(50) DEFAULT NULL,
                new_status VARCHAR(50) DEFAULT NULL,
                remarks TEXT DEFAULT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
            )
        `);

        // 12. Barangays table
        await db.query(`
            CREATE TABLE IF NOT EXISTS ph_barangays (
                id VARCHAR(20) PRIMARY KEY,
                city_municipality_id VARCHAR(20) NOT NULL,
                name VARCHAR(255) NOT NULL
            )
        `);

        // 13. Ensure default admin user
        const adminEmail = 'admin@bizcheckpermit.gov.ph';
        const [existingAdmin] = await db.query('SELECT id, role, status FROM users WHERE email = ?', [adminEmail]);

        if (existingAdmin.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await db.query(`
                INSERT INTO users (full_name, email, contact_number, password, role, status)
                VALUES ('System Administrator', ?, '09000000000', ?, 'system_admin', 'active')
            `, [adminEmail, hashedPassword]);
            console.log(`[DB Init] Created default admin account: ${adminEmail} (password: admin123)`);
        } else if (existingAdmin[0].role !== 'system_admin' || existingAdmin[0].status !== 'active') {
            await db.query(`UPDATE users SET role = 'system_admin', status = 'active' WHERE email = ?`, [adminEmail]);
        }

        // 14. Seed permit requirements if empty
        const [existingReqs] = await db.query('SELECT COUNT(*) as count FROM permit_requirements');
        if (existingReqs[0].count === 0) {
            for (const req of ROXAS_REQUIREMENTS) {
                await db.query(`
                    INSERT INTO permit_requirements (permit_name, description, applicable_business_type, renewal_period, condition_field, condition_value, is_mandatory, required_documents)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [req.permit_name, req.description, req.applicable_business_type, req.renewal_period, req.condition_field, req.condition_value, req.is_mandatory, req.required_documents]);
            }
            console.log(`[DB Init] Seeded ${ROXAS_REQUIREMENTS.length} official Roxas permit requirements.`);
        }

        // 15. Seed Roxas barangays if empty
        const [existingBgys] = await db.query('SELECT COUNT(*) as count FROM ph_barangays WHERE city_municipality_id = "175212000"');
        if (existingBgys[0].count === 0) {
            for (const bgy of ROXAS_BARANGAYS) {
                await db.query(`INSERT IGNORE INTO ph_barangays (id, city_municipality_id, name) VALUES (?, '175212000', ?)`, [bgy.id, bgy.name]);
            }
            console.log(`[DB Init] Seeded ${ROXAS_BARANGAYS.length} Roxas barangays.`);
        }

        // 16. Seed default tax & fee rules if empty
        const [existingRules] = await db.query('SELECT COUNT(*) as count FROM tax_fee_rules');
        if (existingRules[0].count === 0) {
            await db.query(`
                INSERT INTO tax_fee_rules (id, name, description, category, basis, rate, fixed_amount, condition_field, condition_value) VALUES
                (1, 'Basic Mayor\\'s Permit Fee', 'Standard municipal permit fee for all businesses', 'Permit Fee', 'fixed', 0, 500.00, 'always', ''),
                (2, 'Sanitary Inspection Fee', 'Fee for health and sanitation inspection', 'Sanitary Fee', 'fixed', 0, 300.00, 'always', ''),
                (3, 'Business Tax (New)', 'Initial tax based on capitalization', 'Business Tax', 'capitalization', 0.0100, 0, 'business_status', 'New Application'),
                (4, 'Business Tax (Renewal)', 'Tax based on previous year gross sales', 'Business Tax', 'gross_sales', 0.0200, 0, 'business_status', 'Renewal'),
                (5, 'Garbage Fee', 'Solid waste management fee based on floor area', 'Other Fee', 'floor_area', 5.0000, 0, 'always', '')
            `);
            console.log('[DB Init] Seeded default municipal tax & fee rules.');
        }

        // 17. Safe Schema Migrations (Ensures all columns & types exist in production / Railway)
        const ensureColumn = async (table, column, definition) => {
            try {
                const [cols] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
                if (cols.length === 0) {
                    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
                    console.log(`[DB Migration] Added column ${column} to table ${table}`);
                }
            } catch (err) {
                // Table might not exist or already migrated
            }
        };

        const modifyColumn = async (table, column, definition) => {
            try {
                const [cols] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
                if (cols.length > 0) {
                    await db.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
                }
            } catch (err) {
                // Ignore modification notices
            }
        };

        // business_requirements: BPLO verification columns & expanded enum
        await ensureColumn('business_requirements', 'bplo_status', "ENUM('AI Suggested', 'BPLO Verified', 'Not Required', 'Needs Review') NOT NULL DEFAULT 'AI Suggested'");
        await ensureColumn('business_requirements', 'bplo_notes', "TEXT NULL");
        await ensureColumn('business_requirements', 'bplo_verified_at', "TIMESTAMP NULL");
        await ensureColumn('business_requirements', 'bplo_verified_by', "INT NULL");
        await modifyColumn('business_requirements', 'status', "ENUM('Missing', 'Submitted', 'Approved', 'Rejected', 'Expired', 'Have', 'Not Required') DEFAULT 'Missing'");

        // assessments: compliance and readiness scores & longtext payload
        await ensureColumn('assessments', 'compliance_score', "INT DEFAULT 0");
        await ensureColumn('assessments', 'readiness_score', "INT DEFAULT 0");
        await modifyColumn('assessments', 'assessment_result', "LONGTEXT NULL");

        // permit_requirements: conditional evaluation fields
        await ensureColumn('permit_requirements', 'condition_field', "VARCHAR(100) DEFAULT 'always'");
        await ensureColumn('permit_requirements', 'condition_value', "VARCHAR(255) DEFAULT ''");
        await ensureColumn('permit_requirements', 'is_mandatory', "TINYINT(1) DEFAULT 1");
        await ensureColumn('permit_requirements', 'required_documents', "TEXT NULL");

        // businesses: extended registration & operation fields
        await ensureColumn('businesses', 'email', "VARCHAR(255) NULL");
        await ensureColumn('businesses', 'premises_type', "VARCHAR(100) NULL");
        await ensureColumn('businesses', 'business_characteristics', "TEXT NULL");
        await ensureColumn('businesses', 'ownership_type', "VARCHAR(100) NULL");
        await ensureColumn('businesses', 'primary_products', "TEXT NULL");
        await ensureColumn('businesses', 'capitalization', "DECIMAL(15,2) DEFAULT 0.00");
        await ensureColumn('businesses', 'gross_sales', "DECIMAL(15,2) DEFAULT 0.00");
        await ensureColumn('businesses', 'floor_area', "DECIMAL(10,2) DEFAULT 0.00");
        await ensureColumn('businesses', 'business_status', "VARCHAR(100) DEFAULT 'New Application'");
        await ensureColumn('businesses', 'city_municipality_id', "VARCHAR(20) DEFAULT '175212000'");

        // permits: preparation and verification code links
        await ensureColumn('permits', 'application_id', "INT UNIQUE DEFAULT NULL");
        await ensureColumn('permits', 'verification_code', "VARCHAR(100) UNIQUE DEFAULT NULL");
        await ensureColumn('permits', 'pdf_path', "VARCHAR(255) DEFAULT NULL");

        // chat_history: ensure question and response can store large messages
        await modifyColumn('chat_history', 'question', "TEXT NOT NULL");
        await modifyColumn('chat_history', 'response', "LONGTEXT NOT NULL");

        console.log('[DB Init] Database health check & bootstrap completed successfully.');
    } catch (err) {
        console.error('[DB Init] Bootstrap notice:', err.message);
    }
};

module.exports = initDatabase;

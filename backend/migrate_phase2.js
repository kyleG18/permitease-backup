const db = require('./config/db');

const migrate = async () => {
    try {
        console.log('Starting Phase 2 Database Migrations...');

        // 1. Alter businesses table
        await db.query(`
            ALTER TABLE businesses 
            ADD COLUMN capitalization DECIMAL(15, 2) DEFAULT 0,
            ADD COLUMN gross_sales DECIMAL(15, 2) DEFAULT 0,
            ADD COLUMN floor_area DECIMAL(10, 2) DEFAULT 0;
        `).catch(e => console.log('Columns may already exist in businesses table.'));

        // 2. Alter permit_requirements table
        await db.query(`
            ALTER TABLE permit_requirements
            ADD COLUMN condition_field VARCHAR(100) DEFAULT 'always',
            ADD COLUMN condition_value VARCHAR(255) DEFAULT '',
            ADD COLUMN is_mandatory BOOLEAN DEFAULT TRUE;
        `).catch(e => console.log('Columns may already exist in permit_requirements table.'));

        // 3. Alter assessments table
        await db.query(`
            ALTER TABLE assessments
            ADD COLUMN compliance_score INT DEFAULT 0,
            ADD COLUMN readiness_score INT DEFAULT 0;
        `).catch(e => console.log('Columns may already exist in assessments table.'));

        // 4. Create tax_fee_rules table
        await db.query(`
            CREATE TABLE IF NOT EXISTS tax_fee_rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) NOT NULL, -- 'Business Tax', 'Permit Fee', 'Sanitary Fee', etc.
                basis VARCHAR(50) NOT NULL, -- 'fixed', 'gross_sales', 'capitalization', 'floor_area', 'employees'
                rate DECIMAL(10, 4) DEFAULT 0,
                fixed_amount DECIMAL(15, 2) DEFAULT 0,
                condition_field VARCHAR(100) DEFAULT 'always',
                condition_value VARCHAR(255) DEFAULT '',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Create business_requirements table
        await db.query(`
            CREATE TABLE IF NOT EXISTS business_requirements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                business_id INT NOT NULL,
                requirement_id INT NOT NULL,
                document_id INT,
                status ENUM('Missing', 'Submitted', 'Approved', 'Rejected', 'Expired') DEFAULT 'Missing',
                remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
                FOREIGN KEY (requirement_id) REFERENCES permit_requirements(id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
                UNIQUE KEY unique_biz_req (business_id, requirement_id)
            );
        `);

        // 6. Seed initial test data for tax rules
        await db.query(`
            INSERT IGNORE INTO tax_fee_rules (id, name, description, category, basis, rate, fixed_amount, condition_field, condition_value) VALUES
            (1, 'Basic Mayor\\'s Permit Fee', 'Standard permit fee for all businesses', 'Permit Fee', 'fixed', 0, 500.00, 'always', ''),
            (2, 'Sanitary Inspection Fee', 'Fee for health and sanitation inspection', 'Sanitary Fee', 'fixed', 0, 300.00, 'industry_category', 'Food & Beverage'),
            (3, 'Business Tax (New)', 'Initial tax based on capitalization', 'Business Tax', 'capitalization', 0.01, 0, 'business_status', 'New Application'),
            (4, 'Business Tax (Renewal)', 'Tax based on previous year gross sales', 'Business Tax', 'gross_sales', 0.02, 0, 'business_status', 'Renewal'),
            (5, 'Garbage Fee', 'Solid waste management fee based on area', 'Other Fee', 'floor_area', 5.00, 0, 'always', '');
        `);

        console.log('✅ Migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();

-- Migration: ordinance_requirements.sql
-- Enables BPLO Admins to configure local municipal ordinances, issuing agencies, statutory fees, and conditions

ALTER TABLE permit_requirements 
ADD COLUMN issuing_agency VARCHAR(150) DEFAULT 'BPLO / LGU Roxas',
ADD COLUMN ordinance_reference VARCHAR(255) DEFAULT 'Municipal Ordinance & RA 7160',
ADD COLUMN estimated_fee DECIMAL(10,2) DEFAULT 0.00;

-- Populate default official values for Roxas Municipal Requirements
UPDATE permit_requirements SET 
    issuing_agency = 'Barangay Office',
    ordinance_reference = 'RA 7160 Sec 152 / Roxas Revenue Code',
    estimated_fee = 150.00
WHERE permit_name LIKE '%Barangay%';

UPDATE permit_requirements SET 
    issuing_agency = 'Municipal Economic Enterprise / ESO',
    ordinance_reference = 'Municipal Ordinance No. 2022-14',
    estimated_fee = 200.00
WHERE permit_name LIKE '%ESO%';

UPDATE permit_requirements SET 
    issuing_agency = 'Municipal Engineering Office (MEO)',
    ordinance_reference = 'National Building Code (PD 1096)',
    estimated_fee = 500.00
WHERE permit_name LIKE '%Building%' OR permit_name LIKE '%Occupancy%';

UPDATE permit_requirements SET 
    issuing_agency = 'Municipal Treasurer’s Office (MTO)',
    ordinance_reference = 'RA 7160 Sec 156-164',
    estimated_fee = 55.00
WHERE permit_name LIKE '%Community Tax%' OR permit_name LIKE '%Cedula%';

UPDATE permit_requirements SET 
    issuing_agency = 'Municipal Health Office (MHO)',
    ordinance_reference = 'Code on Sanitation (PD 856)',
    estimated_fee = 300.00
WHERE permit_name LIKE '%Sanitary%' OR permit_name LIKE '%Health%';

UPDATE permit_requirements SET 
    issuing_agency = 'DTI / SEC / CDA',
    ordinance_reference = 'Act No. 3883 / RA 11232 / RA 9520',
    estimated_fee = 0.00
WHERE permit_name LIKE '%DTI%' OR permit_name LIKE '%SEC%' OR permit_name LIKE '%Proof of Business%';

UPDATE permit_requirements SET 
    issuing_agency = 'Bureau of Fire Protection (BFP)',
    ordinance_reference = 'Revised Fire Code (RA 9514)',
    estimated_fee = 500.00
WHERE permit_name LIKE '%Fire%' OR permit_name LIKE '%FSIC%';

UPDATE permit_requirements SET 
    issuing_agency = 'Municipal Planning & Development (MPDO)',
    ordinance_reference = 'Comprehensive Land Use Plan (CLUP)',
    estimated_fee = 250.00
WHERE permit_name LIKE '%Zoning%' OR permit_name LIKE '%Locational%';

UPDATE permit_requirements SET 
    issuing_agency = 'Municipal Tourism Operations Office',
    ordinance_reference = 'Tourism Act of 2009 (RA 9593)',
    estimated_fee = 200.00
WHERE permit_name LIKE '%Tourism%';

UPDATE permit_requirements SET 
    issuing_agency = 'Bureau of Internal Revenue (BIR)',
    ordinance_reference = 'National Internal Revenue Code (NIRC)',
    estimated_fee = 0.00
WHERE permit_name LIKE '%Income Tax%' OR permit_name LIKE '%AITR%';

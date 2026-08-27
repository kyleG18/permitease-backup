ALTER TABLE permits 
ADD COLUMN application_id INT NULL,
ADD CONSTRAINT fk_permit_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
ADD UNIQUE KEY unique_application_permit (application_id);

ALTER TABLE permits 
ADD COLUMN verification_code VARCHAR(100) NULL,
ADD UNIQUE KEY unique_verification_code (verification_code);

ALTER TABLE permits 
ADD COLUMN pdf_path VARCHAR(255) NULL;
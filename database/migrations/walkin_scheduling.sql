-- Walk-in Scheduling & Queuing Migration for PermitEase
-- Enables BPLO Daily Walk-in Foot Traffic Management & Fast-Track Queue Slips

USE smartpermit_db;

ALTER TABLE applications
ADD COLUMN walkin_date DATE NULL,
ADD COLUMN walkin_time_slot VARCHAR(50) NULL,
ADD COLUMN queue_ticket_number VARCHAR(50) NULL,
ADD COLUMN walkin_status ENUM('PENDING', 'SCHEDULED', 'ATTENDED', 'NO_SHOW') DEFAULT 'PENDING',
ADD COLUMN counter_verified_by INT NULL,
ADD COLUMN counter_verified_at TIMESTAMP NULL;

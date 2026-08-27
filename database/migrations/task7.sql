ALTER TABLE notifications ADD COLUMN event_key VARCHAR(200) NULL;
ALTER TABLE notifications ADD UNIQUE KEY uk_notification_event (event_key);
ALTER TABLE notifications ADD COLUMN type VARCHAR(50) NULL;
ALTER TABLE notifications ADD COLUMN related_application_id INT NULL;
ALTER TABLE notifications ADD COLUMN related_permit_id INT NULL;
ALTER TABLE notifications ADD COLUMN email_sent TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN email_sent_at DATETIME NULL;
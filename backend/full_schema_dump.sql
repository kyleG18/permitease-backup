CREATE TABLE `application_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `actor_user_id` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `application_history_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `application_history_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=349 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_number` varchar(100) DEFAULT NULL,
  `user_id` int NOT NULL,
  `business_id` int NOT NULL,
  `application_type` enum('NEW','RENEWAL') NOT NULL DEFAULT 'NEW',
  `status` enum('DRAFT','SUBMITTED','UNDER_REVIEW','NEEDS_CORRECTION','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `rejection_reason` text,
  `correction_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `application_number` (`application_number`),
  KEY `user_id` (`user_id`),
  KEY `business_id` (`business_id`),
  KEY `reviewed_by` (`reviewed_by`),
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `applications_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `business_id` int DEFAULT NULL,
  `assessment_result` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `compliance_score` int DEFAULT '0',
  `readiness_score` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `assessments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assessments_ibfk_2` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `details` text,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=192 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `business_requirements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `requirement_id` int NOT NULL,
  `document_id` int DEFAULT NULL,
  `status` enum('Missing','Submitted','Approved','Rejected','Expired') DEFAULT 'Missing',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_biz_req` (`business_id`,`requirement_id`),
  KEY `requirement_id` (`requirement_id`),
  KEY `document_id` (`document_id`),
  CONSTRAINT `business_requirements_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `business_requirements_ibfk_2` FOREIGN KEY (`requirement_id`) REFERENCES `permit_requirements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `business_requirements_ibfk_3` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `businesses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `business_name` varchar(255) NOT NULL,
  `business_type` varchar(100) NOT NULL,
  `industry_category` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `employees` int DEFAULT '0',
  `business_status` enum('New Application','Renewal') DEFAULT 'New Application',
  `date_established` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `capitalization` decimal(15,2) DEFAULT '0.00',
  `gross_sales` decimal(15,2) DEFAULT '0.00',
  `floor_area` decimal(10,2) DEFAULT '0.00',
  `owner_name` varchar(255) DEFAULT NULL,
  `contact_number` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `business_description` text,
  `ownership_type` varchar(100) DEFAULT NULL,
  `primary_products` text,
  `island_group_id` varchar(10) DEFAULT NULL,
  `region_id` varchar(20) DEFAULT NULL,
  `province_id` varchar(20) DEFAULT NULL,
  `city_municipality_id` varchar(20) DEFAULT NULL,
  `barangay_id` varchar(20) DEFAULT NULL,
  `premises_type` varchar(100) DEFAULT NULL,
  `business_characteristics` text,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `businesses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `chat_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `question` text NOT NULL,
  `response` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expiration_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `knowledge_base` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `document_path` varchar(255) NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('Unread','Read') DEFAULT 'Unread',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `event_key` varchar(200) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `related_application_id` int DEFAULT NULL,
  `related_permit_id` int DEFAULT NULL,
  `email_sent` tinyint(1) NOT NULL DEFAULT '0',
  `email_sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notification_event` (`event_key`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=368 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permit_requirements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permit_name` varchar(255) NOT NULL,
  `description` text,
  `applicable_business_type` varchar(255) NOT NULL,
  `renewal_period` varchar(100) DEFAULT 'Annual',
  `required_documents` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `condition_field` varchar(100) DEFAULT 'always',
  `condition_value` varchar(255) DEFAULT '',
  `is_mandatory` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `permits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `business_id` int NOT NULL,
  `permit_name` varchar(255) NOT NULL,
  `permit_number` varchar(100) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `status` enum('Pending','Approved','Expired','Rejected') DEFAULT 'Pending',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `application_id` int DEFAULT NULL,
  `verification_code` varchar(100) DEFAULT NULL,
  `pdf_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_application_permit` (`application_id`),
  UNIQUE KEY `unique_verification_code` (`verification_code`),
  KEY `business_id` (`business_id`),
  CONSTRAINT `fk_permit_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL,
  CONSTRAINT `permits_ibfk_1` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ph_barangays` (
  `id` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `city_municipality_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `city_municipality_id` (`city_municipality_id`),
  CONSTRAINT `ph_barangays_ibfk_1` FOREIGN KEY (`city_municipality_id`) REFERENCES `ph_cities_municipalities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ph_cities_municipalities` (
  `id` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `type` enum('City','Municipality') NOT NULL DEFAULT 'Municipality',
  `province_id` varchar(20) DEFAULT NULL,
  `region_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `province_id` (`province_id`),
  CONSTRAINT `ph_cities_municipalities_ibfk_1` FOREIGN KEY (`province_id`) REFERENCES `ph_provinces` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ph_island_groups` (
  `id` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ph_provinces` (
  `id` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `region_id` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `region_id` (`region_id`),
  CONSTRAINT `ph_provinces_ibfk_1` FOREIGN KEY (`region_id`) REFERENCES `ph_regions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ph_regions` (
  `id` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `island_group_id` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `island_group_id` (`island_group_id`),
  CONSTRAINT `ph_regions_ibfk_1` FOREIGN KEY (`island_group_id`) REFERENCES `ph_island_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `tax_fee_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) NOT NULL,
  `basis` varchar(50) NOT NULL,
  `rate` decimal(10,4) DEFAULT '0.0000',
  `fixed_amount` decimal(15,2) DEFAULT '0.00',
  `condition_field` varchar(100) DEFAULT 'always',
  `condition_value` varchar(255) DEFAULT '',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('business_owner','lgu_admin','system_admin') DEFAULT 'business_owner',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=259 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


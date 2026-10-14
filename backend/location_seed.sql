-- PermitEase Location Seed SQL (Oriental Mindoro / Roxas)

-- Island Groups
INSERT IGNORE INTO ph_island_groups (id, name) VALUES ('luzon', 'Luzon');
INSERT IGNORE INTO ph_island_groups (id, name) VALUES ('visayas', 'Visayas');
INSERT IGNORE INTO ph_island_groups (id, name) VALUES ('mindanao', 'Mindanao');

-- Regions
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('010000000', 'Ilocos Region', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('020000000', 'Cagayan Valley', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('030000000', 'Central Luzon', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('040000000', 'CALABARZON', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('170000000', 'MIMAROPA Region', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('050000000', 'Bicol Region', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('060000000', 'Western Visayas', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('070000000', 'Central Visayas', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('080000000', 'Eastern Visayas', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('090000000', 'Zamboanga Peninsula', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('100000000', 'Northern Mindanao', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('110000000', 'Davao Region', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('120000000', 'SOCCSKSARGEN', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('130000000', 'NCR', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('140000000', 'CAR', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('160000000', 'Caraga', NULL);
INSERT IGNORE INTO ph_regions (id, name, island_group_id) VALUES ('150000000', 'BARMM', NULL);

-- Province: Oriental Mindoro
INSERT IGNORE INTO ph_provinces (id, name, region_id) VALUES ('175200000', 'Oriental Mindoro', '170000000');

-- Cities/Municipalities of Oriental Mindoro
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175201000', 'Baco', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175202000', 'Bansud', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175203000', 'Bongabong', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175204000', 'Bulalacao', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175205000', 'City of Calapan', 'City', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175206000', 'Gloria', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175207000', 'Mansalay', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175208000', 'Naujan', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175209000', 'Pinamalayan', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175210000', 'Pola', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175211000', 'Puerto Galera', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175212000', 'Roxas', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175213000', 'San Teodoro', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175214000', 'Socorro', 'Municipality', '175200000', '170000000');
INSERT IGNORE INTO ph_cities_municipalities (id, name, type, province_id, region_id) VALUES ('175215000', 'Victoria', 'Municipality', '175200000', '170000000');

-- Barangays of Roxas, Oriental Mindoro
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212001', 'Bagumbayan (Pob.)', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212002', 'Cantil', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212003', 'Dangay', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212004', 'Happy Valley', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212005', 'Libertad', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212006', 'Libtong', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212007', 'Mabuhay', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212008', 'Maraska', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212009', 'Odiong', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212010', 'Paclasan (Pob.)', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212011', 'San Aquilino', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212012', 'San Isidro', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212013', 'San Jose', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212014', 'San Mariano', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212015', 'San Miguel', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212016', 'San Rafael', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212017', 'San Vicente', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212018', 'Uyao', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212019', 'Victoria', '175212000');
INSERT IGNORE INTO ph_barangays (id, name, city_municipality_id) VALUES ('175212020', 'Little Tanauan', '175212000');

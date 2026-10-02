/**
 * Shared business type and industry category data for PermitEase.
 * Used by Onboarding.jsx and BusinessProfile.jsx.
 * Based on PSA MSME categorization and LGU permit-relevant categories.
 */

export const BUSINESS_TYPES = [
  'Food & Beverage',
  'Retail & Trading',
  'Services (Personal & Professional)',
  'Manufacturing & Processing',
  'Wholesale & Distribution',
  'Agriculture, Fishery & Aquaculture',
  'Construction & Real Estate',
  'Healthcare & Medical',
  'Tourism, Hospitality & Entertainment',
  'Education & Training',
  'Transportation & Logistics',
  'Information Technology & Communications',
  'Financial & Money Services',
  'Others',
];

export const INDUSTRY_CATEGORIES = [
  {
    group: 'Food & Beverage',
    options: [
      'Restaurant / Full-Service Eatery',
      'Carenderia / Turo-Turo',
      'Fast Food / Quick Service',
      'Cafe / Coffee Shop',
      'Bakery / Bakeshop',
      'Food Kiosk / Cart / Stall',
      'Catering Services',
      'Water Refilling Station',
      'Ice Cream / Halo-Halo Shop',
      'Bar / Videoke Bar',
      'Snack House / Meriendahan',
    ],
  },
  {
    group: 'Retail & Trading',
    options: [
      'Sari-Sari Store',
      'Grocery / Mini Grocery',
      'Supermarket / Department Store',
      'Convenience Store / 24-Hour Store',
      'Boutique / Clothing & Apparel',
      'Footwear Store',
      'Appliance Store',
      'Hardware / Construction Supplies',
      'Agri-Vet / Farm Supplies Store',
      'Fuel / Gasoline Station',
      'Pharmaceutical / Drug Store',
      'School Supplies / Bookstore',
      'Gift Shop / Souvenir Store',
      'Secondhand / Ukay-Ukay Shop',
      'General Merchandise',
    ],
  },
  {
    group: 'Services (Personal & Professional)',
    options: [
      'Salon / Barbershop / Beauty Parlor',
      'Laundry Shop / Dry Cleaning',
      'Auto Repair / Vulcanizing Shop',
      'Motorcycle / Bicycle Repair',
      'Electronics / Appliance Repair',
      'Welding / Fabrication Shop',
      'Printing / Photocopying / Advertising',
      'Photography / Video Services',
      'Event Styling / Catering Management',
      'Funeral / Memorial Services',
      'Pest Control Services',
      'Cleaning / Janitorial Services',
      'Security Agency',
      'Manpower / Recruitment Agency',
      'Law Office / Legal Services',
      'Accounting / Audit / Tax Services',
      'Engineering / Architecture Firm',
      'Consultancy Firm',
    ],
  },
  {
    group: 'Manufacturing & Processing',
    options: [
      'Food Processing / Cottage Industry',
      'Garments / Textile Manufacturing',
      'Furniture / Woodcraft Manufacturing',
      'Hollow Block / Construction Materials Production',
      'Soap / Detergent / Chemical Manufacturing',
      'Feed Mill / Animal Feed Production',
      'Charcoal / Firewood Production',
      'Metal Fabrication / Blacksmithing',
      'Bottling / Packaging Plant',
      'Other Manufacturing',
    ],
  },
  {
    group: 'Wholesale & Distribution',
    options: [
      'Wholesale Grocery / Food Distributor',
      'Pharmaceutical Distributor',
      'Agricultural Products Trader',
      'Hardware / Building Materials Wholesaler',
      'Other Wholesale / Trading',
    ],
  },
  {
    group: 'Agriculture, Fishery & Aquaculture',
    options: [
      'Rice / Corn Farm',
      'Vegetable / Fruit Farm',
      'Livestock / Poultry Farm',
      'Fish Pond / Aquaculture',
      'Fishing Vessel / Fishing Operations',
      'Agri-Tourism Farm',
      'Coconut Farm / Copra',
      'Other Agricultural Activity',
    ],
  },
  {
    group: 'Construction & Real Estate',
    options: [
      'General Contractor / Construction Firm',
      'Real Estate Developer',
      'Apartment / Boarding House / Dormitory',
      'Memorial / Cemetery Park',
      'Property Management',
    ],
  },
  {
    group: 'Healthcare & Medical',
    options: [
      'General Medical Clinic',
      'Dental Clinic',
      'Optical / Eye Clinic',
      'Pharmacy / Drug Store',
      'Medical Laboratory',
      'Lying-In / Birthing Clinic',
      'Veterinary Clinic',
      'Physical Therapy / Rehabilitation Center',
      'Dialysis Center',
    ],
  },
  {
    group: 'Tourism, Hospitality & Entertainment',
    options: [
      'Hotel / Inn',
      'Resort / Beach Resort',
      'Pension House / Hostel',
      'Travel Agency / Tour Operator',
      'Restaurant with Entertainment',
      'Videoke / KTV Bar',
      'Billiard Hall / Game Center',
      'Gym / Fitness Center',
      'Spa / Wellness Center',
      'Movie Theater / Cinema',
    ],
  },
  {
    group: 'Education & Training',
    options: [
      'Private School / Learning Center',
      'Tutorial / Review Center',
      'Skills Training / Vocational Center',
      'Driving School',
      'Daycare / Preschool',
    ],
  },
  {
    group: 'Transportation & Logistics',
    options: [
      'Trucking / Freight Services',
      'Taxi / TNVS / Transport Services',
      'Tricycle / Pedicab Operators',
      'Bus / Van Terminal',
      'Courier / Delivery Services',
      'Warehousing / Cold Storage',
    ],
  },
  {
    group: 'Information Technology & Communications',
    options: [
      'Internet Cafe / Computer Shop',
      'Software Development / IT Services',
      'Mobile Phone / Electronics Shop',
      'CCTV / Alarm System Installation',
      'Cable TV / Internet Provider',
    ],
  },
  {
    group: 'Financial & Money Services',
    options: [
      'Pawnshop',
      'Money Remittance / Money Changer',
      'Cooperative (Financial)',
      'Lending / Financing Company',
      'Insurance Agency',
    ],
  },
  {
    group: 'Others',
    options: [
      'Junk Shop / Scrap Dealer',
      'LPG Dealer / Refilling Station',
      'Pet Shop / Veterinary Supply',
      'Others (Please describe in Business Description)',
    ],
  },
];

/**
 * Returns industry_category options that match the selected business_type.
 * Falls back to all options if no matching group found.
 */
export const getCategoriesForType = (businessType) => {
  if (!businessType) return INDUSTRY_CATEGORIES;
  const match = INDUSTRY_CATEGORIES.find(
    (g) => g.group.toLowerCase() === businessType.toLowerCase()
  );
  return match ? [match] : INDUSTRY_CATEGORIES;
};

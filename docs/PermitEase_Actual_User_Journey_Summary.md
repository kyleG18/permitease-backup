# PermitEase: Actual User Journey Summary

**Purpose:** This document provides a clear, plain-language, non-technical summary of how **PermitEase** actually works today, based strictly on its verified source code. It is designed to give UI/UX, accessibility, and product design AI assistants a grounded foundation of real system capabilities, actual user actions, and where digital handoffs stop.

---

## 1. Executive Summary & System Identity

PermitEase is a **permit preparation, compliance readiness, and pre-assessment system** built specifically for the Municipality of Roxas, Oriental Mindoro. 

It is **NOT an official permit-issuing system**. It does not replace the City Hall Cashier, the Municipal Treasurer, or the Mayor's physical signature. Instead, it serves as a **digital bridge** that allows micro, small, and medium enterprises (MSMEs) to:
1. Understand which clearances they actually need before traveling to City Hall.
2. Estimate their official taxes and fees transparently so they know their required budget.
3. Upload and organize clearance documents (such as photos or PDFs of their Barangay Clearance, DTI certificate, Fire Safety Inspection Certificate, and Sanitary Permit).
4. Fill out the standard Philippine Unified Application Form online.
5. Have a BPLO officer review their submission in advance, request corrections digitally, or mark the preparation package as **Verified**.
6. Generate a printable **Physical Preparation Summary Slip** with a verification code to take to City Hall.

---

## 2. What an MSME / Business Owner Can Actually Do Today

### Step 1: Create an Account & Set Up Their Business Profile
- **What happens:** The business owner signs up with their name, email, phone, and password. 
- **The Onboarding Guard:** Upon first login, the user cannot access other features until they set up their business profile.
- **What they enter:** Business Name, Trade Name, Business Type (Sole Proprietorship, Partnership, Corporation, Cooperative), Registration Number (DTI, SEC, or CDA), Address, Barangay in Roxas, Capital Investment (if new) or Annual Gross Sales (if renewing), Floor Area ($m^2$), and Employee Count.
- **Where data goes:** Saved in the database and automatically pre-populates all subsequent forms and fee calculations.

### Step 2: Run the AI Business Assessment
- **What happens:** The owner navigates to the Assessment tool. The system evaluates their business description and characteristics.
- **How it evaluates:** An AI service (or an automatic local rule engine if offline) classifies the business risk and cross-references Roxas municipal ordinances.
- **What the user gets:** A customized checklist of required clearances (e.g., Mayor's Permit, Barangay Clearance, Sanitary Permit, Fire Safety Inspection Certificate) and a **Permit Readiness Score (0% – 100%)** indicating how complete their preparations are.

### Step 3: Simulate Taxes & Official Fees
- **What happens:** The owner navigates to the Tax or Fee Estimation page.
- **What they see:** A deterministic financial estimate based on the Local Government Code (RA 7160) and BFP Fire Code (RA 9514).
  - **Local Business Tax (LBT):** Calculated from declared capitalization or gross sales (with a legal 1% statutory cap for retailers making over ₱400,000).
  - **Regulatory Fees:** Mayor's permit, sanitary inspection, and garbage fees based on area and category.
  - **Fire Safety Fee (BFP):** Computed as 15% of regulatory fees with a statutory minimum of ₱500.00.
  - **Quarterly Schedule:** Shows the exact payment schedule if paying in 4 quarterly installments (due on the 20th of January, April, July, and October).

### Step 4: Gather & Upload Clearances
- **What happens:** In the Documents or Clearances hub, the user sees a list of missing requirements.
- **What they can upload:** The system accepts **PDF documents or smartphone camera photos (JPG/PNG)** up to 10 MB. This allows mobile users to take photos of paper clearances.
- **What changes:** Uploading a document marks that requirement row as **`Submitted`**, increasing the Permit Readiness percentage score.

### Step 5: Fill & Submit the Unified LGU Application
- **What happens:** The owner clicks "New Application". The system automatically pulls their profile, line of business, and clearances into the official Unified Form layout.
- **The Submission Gate:** If any mandatory clearance document is missing, the system **blocks submission** and prompts them to upload the file first.
- **After submission:** The application status changes from `DRAFT` to **`SUBMITTED`**, generates a tracking number (e.g., `BP-2026-00003`), logs the event to history, and sends a confirmation email.

### Step 6: Follow the Live Status & Handle Corrections
- **What happens:** The owner tracks their application on a 4-step progress bar:
  `Application Prepared` ➔ `Submitted` ➔ `LGU Review` ➔ `Decision`.
- **If BPLO Requests Correction:** The status changes to `NEEDS_CORRECTION`. The owner receives an email and in-app alert showing the reviewer's specific remarks (e.g., *"Barangay Clearance is expired; upload 2026 renewal"*). The owner replaces the file and resubmits.
- **If Approved:** The status turns green (`APPROVED`).

### Step 7: Print the Physical Preparation Summary Slip
- **What the user gets:** The owner downloads a generated PDF labeled **"PHYSICAL DOCUMENT PREPARATION SUMMARY"**. It lists all verified clearances, declared fees, and a unique **Verification Code** (e.g., `VRF-2026-XXXXX`).
- **Where the digital flow stops:** The user prints this summary or saves it on their phone, walks into Roxas City Hall, presents it to the BPLO counter/cashier for payment, and receives their physical metal permit plate and official sticker.

### Step 8: Monitor Annual Renewals & Get Expiry Alerts
- **What happens:** The system calculates days remaining until expiration (statutory permit expiry is always December 31).
- **Reminders:** The system tracks 60-day, 30-day, and 7-day alert thresholds before the January 20 renewal deadline, warning about the 25% statutory surcharge and 2% monthly interest penalty for late filing.

### Step 9: Ask the Multilingual AI Assistant
- **What happens:** The owner can open the chat assistant anytime and ask questions in **English, Tagalog, or Hiligaynon (Ilonggo)**.
- **How it answers:** The assistant reads the user's live profile, missing requirements, and tax estimates from the database, answering personalized questions like *"Ano pa kulang ko para sa Mayor's permit?"*

---

## 3. What BPLO Personnel / LGU Administrators Can Actually Do Today

### Step 1: Manage the Review Queue
- **What happens:** BPLO officers view a live table of all applications submitted across Roxas City.
- **Filtering & Search:** Filter by status (`Submitted`, `Under Review`, `Needs Correction`, `Approved`, `Rejected`) or search by business name, owner name, or application number.

### Step 2: Open and Lock an Application for Review
- **What happens:** When an officer opens an application, they click **"Start Review"**.
- **Locking:** Status immediately moves to `UNDER_REVIEW`, recording the reviewer's name and timestamp so other staff know it is being processed.

### Step 3: Inspect the Submission
- **Unified Form:** View the official form details (owner identity, line of business, capitalization, gross receipts).
- **Checklist & Readiness:** Check whether the applicant achieved 100% readiness and which clearances are ready.
- **Document Review:** Review uploaded documents. *(Note: Clicking "View File" currently triggers a file download to the officer's desktop rather than opening an inline image preview).*
- **Automated Fee Card:** Inspect the computer-assessed tax and regulatory fees.

### Step 4: Make a Formal Decision
- **Option A — Request Corrections:** The officer types mandatory notes explaining what needs fixing. Status becomes `NEEDS_CORRECTION`, and the applicant is automatically notified.
- **Option B — Approve / Mark Verified:** The officer approves the preparation package. The system:
  1. Sets status to `APPROVED`.
  2. Sets expiration date to December 31.
  3. Generates a unique verification code (`VRF-YYYY-XXXXX`).
  4. Generates the final preparation summary PDF.
  5. Fires an approval notification to the applicant.
- **Option C — Reject:** Used for ineligible or fraudulent applications, requiring mandatory rejection reasons.

### Step 5: Oversee Renewals & Reports
- **Renewals Table:** View all municipal businesses sorted by expiration date, identifying businesses that are overdue or nearing expiration.
- **Preparation Records:** Master list of all verified permits and verification codes.
- **Analytics & Reports:** High-level dashboard metrics showing total registered MSMEs, review queue counts, and estimated revenue.

---

## 4. What the System Administrator Can Actually Do Today

- **User Management:** Create new staff accounts (BPLO reviewers or admins), change user roles (`business_owner`, `lgu_admin`, `system_admin`), and activate or deactivate accounts. (Self-demotion and self-deactivation are strictly blocked).
- **Forensic Audit Logs:** View an immutable table of the last 500 system events (user logins, application submissions, status updates, document deletions) showing the user name, role, IP address, and timestamp.
- **Role Matrix View:** View a static informational reference describing permissions for each role.

---

## 5. What a Public / Walk-in Verifier Can Do

- **Public Verification (`/verify-permit/:code`):** Anyone who scans the QR code or enters a verification code from a PermitEase slip can view a public verification screen.
- **What it shows:** Confirms whether the record is `VALID` or `EXPIRED`, along with the Business Name, Business Type, Industry Category, Issue Date, and Expiration Date.
- **Privacy Protection:** Personal owner contact details and private financial records (capitalization, sales, taxes) are completely hidden from public view.

---

## 6. Where the Current Workflow Stops & Key Limitations

To guide future UI/UX and process improvements, keep in mind these verified boundaries:

1. **No Cashier Payment:** PermitEase does not process payments or credit cards. Payment must occur at the municipal cashier.
2. **No Official Permit Issuance:** PermitEase issues a verified preparation summary, not the legal Mayor's Permit plate or official seal.
3. **No Direct iBPLS File Transfer:** The DICT iBPLS link simply opens the national website in a new browser tab; it does not automatically submit data.
4. **Desktop File Downloads for BPLO:** BPLO officers currently have to download submitted photo clearances to their local computer instead of viewing them in an on-screen preview modal or lightbox.
5. **Application-Wide Rejection:** An officer cannot reject a single document individually; they must return the entire application for correction with a written explanation note.

# PermitEase System Update Context

This document summarizes the recent architectural, functional, and UI/UX changes made to the PermitEase system. This context is designed to be fed into an AI assistant to help update your project manuscript, thesis, or technical documentation.

## 1. Shift in Core System Philosophy
- **Preparation vs. Processing**: The system's philosophy was refined to emphasize that PermitEase is an **online preparation and tracking tool**, not an online permit approval system. 
- **Offline BPLO Submission**: The workflow now explicitly clarifies that official assessment, signatures, payment, and permit processing are handled physically at the Municipality of Roxas BPLO office. 
- **Removal of Misleading Features**: The "My Applications" module was removed from the MSME/Business Owner dashboard to prevent confusion. Users do not "submit" online; instead, they prepare their requirements and download the application form for physical submission.

## 2. Artificial Intelligence Integration (Groq API)
The system now leverages the Groq API (using the `llama3-70b-8192` or similar open-source models) to power three major intelligent features:

### A. AI Chat Assistant (AI Help)
- **Functionality**: A conversational chatbot that answers MSME questions regarding permit requirements, processes, and fees.
- **Anti-Hallucination Measures**: The AI is strictly prompted to base its answers *only* on the real-time configured LGU rules (`permit_requirements`, `tax_fee_rules`) and the user's specific business profile. It is instructed never to invent fees or approve applications.
- **Language Support**: Designed to respond in the language the user speaks (English, Tagalog, or Taglish).

### B. AI Permit Assessment (Classification)
- **Functionality**: Analyzes a business description (or existing business profile data like capitalization, floor area, employees) and automatically determines the most likely **Industry Category** and **Business Type**.
- **Requirement Mapping**: Cross-references the AI's classification against the official `permit_requirements` table in the database to generate a personalized list of recommended permit requirements for the business.

### C. AI Tax & Fee Estimation
- **Functionality**: Replaced static hardcoded loops with an AI-driven structured JSON generator. The AI reads the business profile and the active `tax_fee_rules` table to compute a transparent, step-by-step fee breakdown.
- **BFP Computation**: Specifically handles complex formulas, such as the BFP Fire Safety Inspection Fee (15% of applicable LGU fees, subject to a ₱500 minimum).
- **Transparency**: Outputs an `estimation_confidence` level and explicitly flags if any required business information is missing to provide a fully accurate estimate.

## 3. Workflow Redesign: Permit Readiness
- **Centralized Hub**: "Permit Readiness" is now the primary workflow page for business owners preparing for application.
- **AI Integration**: If the user hasn't completed the AI Assessment, they are prompted to do so. Once completed, the AI's recommended requirements populate the Readiness checklist.
- **Interactive Checklist**: Users track their physical preparation by marking requirements as "I Have This" or "I Still Need This". 
- **Readiness Score**: The system calculates a readiness percentage (e.g., 67% Ready) based on user inputs. 
- **Application Form**: Once 100% ready, the user is prompted to download/print the official Roxas Business Permit Application Form to bring to the BPLO.

## 4. UI/UX and Visual Identity
- **Civic Government Design**: Transitioned from a generic "startup SaaS" dashboard look to a professional, civic government portal aesthetic (similar to GOV.UK).
- **Color Palette**: Utilizes a disciplined palette of ~60% white/off-white, 20% navy/dark neutral, 15% government green, and 5% gold/semantic colors.
- **Vanilla CSS**: All styling changes were implemented using pure Vanilla CSS, without relying on external CSS frameworks like Tailwind, keeping the codebase lightweight and maintainable.
- **Clear Signposting**: Added "Official BPLO Process" notices across the app to ensure users understand the boundary between the PermitEase digital preparation and the physical government process.

## 5. Technical Stack Consistency
- **Frontend**: React + Vite (Vanilla CSS)
- **Backend**: Node.js + Express
- **Database**: MySQL
- **AI Provider**: Groq API (using `@groq/groq-sdk`)

---
**Instructions for the Manuscript-Writing AI:**
*Use the points above to update the "System Architecture", "Features", "User Interface Design", and "Methodology" sections of the project manuscript. Emphasize the integration of generative AI (Groq) for automated classification and assessment, and highlight the UX pivot towards "Guided Preparation" rather than "Online Processing."*

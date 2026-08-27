# PermitEase

**PermitEase** is the official Business Permit Compliance and Renewal System for the Municipality of Roxas, Oriental Mindoro. It streamlines the business permitting process by providing a digital platform for business owners and LGU administrators to manage applications, renewals, assessments, and notifications.

## Project Structure

\\\
PermitEase/
├── backend/                # Express.js API server
│   ├── config/             # Database connection & config
│   ├── controllers/        # Route controllers (logic)
│   ├── middleware/         # Auth and RBAC middleware
│   ├── routes/             # API route definitions
│   ├── scripts/            # Utility scripts (e.g., resetAdmin, setup-db)
│   ├── services/           # Reusable services (AI, Email, PDF generation, Audit)
│   ├── tests/              # Acceptance and workflow tests
│   └── server.js           # Express app entry point
│
├── database/               # Database definitions
│   ├── schema.sql          # Base tables and schema
│   └── migrations/         # Feature-specific SQL migrations
│
├── frontend/               # React + Vite frontend application
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React Context (Auth, Business)
│   │   ├── layouts/        # Page layouts (Sidebar, Header, etc.)
│   │   ├── pages/          # Full page views
│   │   ├── App.jsx         # Main router
│   │   └── main.jsx        # React entry point
│   └── index.html
│
└── uploads/                # Directory for generated permit PDFs and temp uploads
\\\

## Technologies Used

*   **Frontend:** React 19, Vite, React Router DOM, Recharts (for analytics), vanilla CSS.
*   **Backend:** Node.js, Express.js, MySQL (mysql2), JSON Web Tokens (JWT) for authentication.
*   **AI Integration:** Groq API (LLM for business categorization and advisory).
*   **PDF/QR:** PDFKit and QRCode for dynamic permit generation.

## Local Setup

### 1. Database

1.  Ensure MySQL is running locally.
2.  Import the base schema: \mysql -u root -p < database/schema.sql\
3.  Import the migrations in order from \database/migrations/\.
4.  Optionally run \
ode backend/setup-db.js\.

### 2. Backend

1.  \cd backend\
2.  \
pm install\
3.  Create a \.env\ file in the \ackend/\ directory using the following variables (fill in your local values):
    \\\env
    PORT=5000
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_db_password
    DB_NAME=smartpermit_db
    JWT_SECRET=your_jwt_secret
    GROQ_API_KEY=your_groq_api_key
    FRONTEND_URL=http://localhost:5173
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password
    \\\
4.  \
pm start\

### 3. Frontend

1.  \cd frontend\
2.  \
pm install\
3.  \
pm run dev\
4.  Access the application at \http://localhost:5173\

## Testing

Backend workflow and regression tests can be run from the \ackend/\ directory:

\\\ash
cd backend
npm run test:workflow
npm run test:fees
npm run test:renewals
npm run test:permits
npm run test:notifications
npm run test:analytics
npm run test:ai
npm run test:onboarding
\\\

## Default Admin Credentials

If you seeded the database correctly, you can access the admin dashboard using:
*   **Email:** admin@bizcheckpermit.gov.ph
*   **Password:** Admin@12345 (or run \
ode backend/resetAdmin.js\ to reset to \dmin123\)
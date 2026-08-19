const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/businesses', require('./routes/businessRoutes'));
app.use('/api/requirements', require('./routes/requirementRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/permits', require('./routes/permitRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/knowledge', require('./routes/knowledgeRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));
app.use('/api/compliance', require('./routes/complianceRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/tax', require('./routes/taxRoutes'));
app.use('/api/readiness', require('./routes/readinessRoutes'));
app.use('/api/renewals', require('./routes/renewalRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to BizCheckPermit API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

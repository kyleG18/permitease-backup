const fs = require('fs');
const path = './backend/controllers/applicationController.js';
let c = fs.readFileSync(path, 'utf8');

// Fix user-facing response messages only — keep internal function names intact
// 1. Success message when approve action runs
c = c.replace(
    "res.json({ message: 'Application approved and permit generated.', status: 'APPROVED' });",
    "res.json({ message: 'Preparation submission marked as Verified. BPLO processing must still be completed officially.', status: 'APPROVED' });"
);

// 2. Error message for approve
c = c.replace(
    "res.status(500).json({ message: 'Unable to approve application. Please try again.' });",
    "res.status(500).json({ message: 'Unable to mark as Verified. Please try again.' });"
);

// 3. Error message for reject
c = c.replace(
    "res.status(500).json({ message: 'Unable to reject application. Please try again.' });",
    "res.status(500).json({ message: 'Unable to request corrections. Please try again.' });"
);

// 4. Already approved guard message
c = c.replace(
    "return res.status(200).json({ message: 'Application is already approved and permit exists.', status: 'APPROVED' });",
    "return res.status(200).json({ message: 'This preparation submission has already been marked as Verified.', status: 'APPROVED' });"
);

// 5. Notification body sent to MSME — change "APPROVED + PERMIT ISSUED" comment + notification title
c = c.replace(
    "// Fire-and-forget rich notifications for APPROVED + PERMIT ISSUED",
    "// Fire-and-forget notification: preparation marked as Verified by BPLO"
);

// 6. Fix any notification title that says "Permit Issued" (in the notification INSERT)
c = c.replace(
    "'PERMIT_ISSUED'",
    "'PREPARATION_VERIFIED'"
);

fs.writeFileSync(path, c);
console.log('Patched applicationController.js user-facing messages');

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure directories exist
const PERMITS_DIR = path.join(__dirname, '../../uploads/permits');
const TEMP_DIR = path.join(__dirname, '../../uploads/temp');

if (!fs.existsSync(PERMITS_DIR)) fs.mkdirSync(PERMITS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Generate a unique verification code
 */
const generateVerificationCode = () => {
    // Generate unpredictable secure random hex
    return `BP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

/**
 * Generate a PDF permit and save to temporary location
 * @param {Object} data - Permit and business data
 * @returns {Promise<string>} - Path to temporary PDF file
 */
const generatePermitDocument = async (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { 
                permit_number, 
                application_number, 
                business_name, 
                owner_name, 
                business_type, 
                industry_category, 
                address, 
                permit_type, 
                issue_date, 
                expiration_date,
                verification_code 
            } = data;

            // Define verification URL (this would normally be the live frontend URL)
            // For capstone context, we use a generic placeholder or localhost if needed
            const verificationUrl = `http://localhost:5173/verify-permit/${verification_code}`;

            // Generate QR Code as Data URI
            const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
                errorCorrectionLevel: 'H',
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' }
            });

            const tempFileName = `permit_temp_${crypto.randomBytes(4).toString('hex')}.pdf`;
            const tempFilePath = path.join(TEMP_DIR, tempFileName);

            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const stream = fs.createWriteStream(tempFilePath);
            
            doc.pipe(stream);

            // --- HEADER ---
            doc.font('Helvetica-Bold')
               .fontSize(14)
               .text('REPUBLIC OF THE PHILIPPINES', { align: 'center' })
               .text('MUNICIPALITY OF ROXAS', { align: 'center' })
               .text('PROVINCE OF ORIENTAL MINDORO', { align: 'center' });
            
            doc.moveDown();
            doc.fontSize(20).fillColor('#16A34A').text('BUSINESS PERMIT', { align: 'center' });
            doc.fillColor('black');
            doc.moveDown(2);

            // --- PERMIT NO & APP NO ---
            doc.fontSize(10).font('Helvetica');
            doc.text(`PERMIT NO: `, 50, 180, { continued: true }).font('Helvetica-Bold').text(`${permit_number}`);
            doc.font('Helvetica').text(`APPLICATION NO: `, 50, 195, { continued: true }).font('Helvetica-Bold').text(`${application_number}`);

            // --- BUSINESS INFORMATION ---
            doc.moveDown(2);
            const startY = doc.y;
            doc.font('Helvetica-Bold').fontSize(12).text('BUSINESS INFORMATION', 50, startY);
            
            doc.font('Helvetica').fontSize(10);
            doc.text('Business Name:', 50, startY + 20).font('Helvetica-Bold').text(business_name, 150, startY + 20);
            doc.font('Helvetica').text('Owner:', 50, startY + 35).font('Helvetica-Bold').text(owner_name, 150, startY + 35);
            doc.font('Helvetica').text('Business Type:', 50, startY + 50).font('Helvetica-Bold').text(business_type, 150, startY + 50);
            doc.font('Helvetica').text('Industry Category:', 50, startY + 65).font('Helvetica-Bold').text(industry_category, 150, startY + 65);
            doc.font('Helvetica').text('Address:', 50, startY + 80).font('Helvetica-Bold').text(address, 150, startY + 80, { width: 350 });

            // --- PERMIT INFORMATION ---
            doc.moveDown(2);
            const permY = doc.y + 10;
            doc.font('Helvetica-Bold').fontSize(12).text('PERMIT INFORMATION', 50, permY);
            
            doc.font('Helvetica').fontSize(10);
            doc.text('Permit Type:', 50, permY + 20).font('Helvetica-Bold').text(permit_type === 'NEW' ? 'New Business Permit' : 'Renewal', 150, permY + 20);
            doc.font('Helvetica').text('Date Issued:', 50, permY + 35).font('Helvetica-Bold').text(issue_date, 150, permY + 35);
            doc.font('Helvetica').text('Valid Until:', 50, permY + 50).font('Helvetica-Bold').text(expiration_date, 150, permY + 50);

            // --- QR CODE & VERIFICATION ---
            // Draw QR code near bottom right
            const qrSize = 100;
            doc.image(qrCodeDataUrl, doc.page.width - 50 - qrSize, doc.page.height - 150, { width: qrSize });
            
            doc.font('Helvetica').fontSize(9);
            doc.text('Scan the QR code to verify this permit.', doc.page.width - 50 - qrSize - 20, doc.page.height - 40, { width: 140, align: 'center' });

            // Disclaimer / System Generated Note
            doc.text('SYSTEM-GENERATED BUSINESS PERMIT DOCUMENT', 50, doc.page.height - 70);
            doc.text('This document was automatically generated by PermitEase.', 50, doc.page.height - 55);

            doc.end();

            stream.on('finish', () => resolve(tempFilePath));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Move temp file to final destination
 */
const finalizePermitDocument = (tempPath, permitNumber) => {
    const finalFileName = `${permitNumber}_${Date.now()}.pdf`;
    const finalPath = path.join(PERMITS_DIR, finalFileName);
    fs.renameSync(tempPath, finalPath);
    return `permits/${finalFileName}`;
};

/**
 * Cleanup temp file
 */
const cleanupTempFile = (tempPath) => {
    if (tempPath && fs.existsSync(tempPath)) {
        try {
            fs.unlinkSync(tempPath);
        } catch (e) {
            console.error('Failed to cleanup temp file:', e);
        }
    }
};

module.exports = {
    generateVerificationCode,
    generatePermitDocument,
    finalizePermitDocument,
    cleanupTempFile
};

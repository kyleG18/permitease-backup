import { X, ShieldCheck, FileText, Lock } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

const TermsPrivacyModal = ({ isOpen, onClose, initialTab = 'terms', onAccept }) => {
  const { lang } = useTranslation();
  const isTl = lang === 'tl';

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTl ? 'Mga Tuntunin ng Paggamit at Abiso sa Pagkapribado' : 'Terms of Use & Data Privacy Notice'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        backgroundColor: 'rgba(12, 32, 20, 0.65)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #C9D6CE',
          borderTop: '4px solid #14532D',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 56px rgba(12, 43, 24, 0.28)',
          fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif"
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #113B22 0%, #14532D 100%)',
          padding: '1.15rem 1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              backgroundColor: '#FEF3C7', border: '2px solid #F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <ShieldCheck size={20} color="#14532D" />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#FEF3C7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Municipality of Roxas, Oriental Mindoro · PermitEase
              </div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.25 }}>
                {isTl ? 'Mga Tuntunin ng Paggamit at Data Privacy Notice' : 'Terms of Use & Data Privacy Notice'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#FFFFFF', borderRadius: '6px', padding: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '1.35rem 1.5rem', overflowY: 'auto', flex: '1 1 auto', fontSize: '14.5px', lineHeight: 1.65, color: '#1E293B' }}>
          {/* Section 1: Terms of Use */}
          <div style={{ marginBottom: '1.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#14532D', fontWeight: 800, fontSize: '15.5px', marginBottom: '0.5rem' }}>
              <FileText size={18} />
              <span>{isTl ? '1. Mga Tuntunin ng Paggamit (Terms of Use)' : '1. Terms of Use & Advisory Disclaimer'}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.45rem' }}>
              <li>
                <strong>{isTl ? 'Preparation & Pre-Assessment Companion:' : 'Preparation & Pre-Assessment Companion:'}</strong>{' '}
                {isTl
                  ? 'Ang PermitEase ay isang gabay sa paghahanda ng business permit para sa Munisipyo ng Roxas, Oriental Mindoro. Hindi nito pinapalitan ang opisyal na DICT iBPLS/eBPLS portal o ang pisikal na proseso sa Municipal Hall.'
                  : 'PermitEase is a business permit preparation and pre-assessment companion for the Municipality of Roxas, Oriental Mindoro. It does not replace the official DICT iBPLS/eBPLS portal or official Municipal Hall filing.'}
              </li>
              <li>
                <strong>{isTl ? 'Gabay Lamang ang AI at Estimasyon:' : 'Advisory Only (AI & Estimates):'}</strong>{' '}
                {isTl
                  ? 'Ang lahat ng AI Permit Assessment, PSA PSIC suggestions, Permit Fee Estimates, BIR Tax Estimates, at sagot ng AI Assistant ay gabay lamang. Ang pinal na halaga ng buwis, bayarin, at pag-apruba ng permit ay nasa kamay ng BPLO Roxas, Municipal Treasurer\'s Office (MTO), BFP, MHO, at BIR.'
                  : 'All AI Permit Assessments, PSA PSIC suggestions, Permit Fee Estimates, BIR Tax Estimates, and AI Assistant responses are advisory only. Final tax/fee assessments and permit approvals are determined exclusively by BPLO Roxas, Municipal Treasurer\'s Office (MTO), BFP, MHO, and BIR.'}
              </li>
              <li>
                <strong>{isTl ? 'Walang Online Payment:' : 'No Online Payments:'}</strong>{' '}
                {isTl
                  ? 'Hindi tumatanggap o nagpoproseso ng online payment ang PermitEase. Ang lahat ng opisyal na bayarin ay binabayaran sa Municipal Treasurer\'s Office o sa opisyal na channel ng gobyerno.'
                  : 'PermitEase does not collect or process online payments. All official fees and taxes are paid directly to the Municipal Treasurer\'s Office or authorized government payment channels.'}
              </li>
              <li>
                <strong>{isTl ? 'Katumpakan ng Impormasyon:' : 'Accuracy of Submitted Data:'}</strong>{' '}
                {isTl
                  ? 'Tungkulin ng gumagamit na magbigay ng tapat at tamang impormasyon tungkol sa negosyo, capitalization, gross sales, at mga petsa ng rehistro (DTI/SEC/CDA).'
                  : 'Users are responsible for providing accurate and truthful business details, financial figures, and registration expiry dates (DTI/SEC/CDA).'}
              </li>
            </ul>
          </div>

          {/* Section 2: Data Privacy Notice (RA 10173) */}
          <div style={{ backgroundColor: '#F4F8F5', border: '1.5px solid #C9D6CE', borderRadius: '10px', padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#14532D', fontWeight: 800, fontSize: '15.5px', marginBottom: '0.5rem' }}>
              <Lock size={18} />
              <span>{isTl ? '2. Abiso sa Pagkapribado ng Datos (RA 10173 — Data Privacy Act)' : '2. Data Privacy Notice (Republic Act No. 10173)'}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.45rem' }}>
              <li>
                <strong>{isTl ? 'Kinokolektang Impormasyon:' : 'Information Collected:'}</strong>{' '}
                {isTl
                  ? 'Pangalan, email, contact number, pangalan at lokasyon ng negosyo, financial indicators, DTI/SEC/CDA details, at mga in-upload na dokumento para sa pre-assessment at Window 1 walk-in scheduling.'
                  : 'Name, email, mobile number, business profile and Roxas address, financial indicators, DTI/SEC/CDA registration details, and uploaded supporting documents solely for permit preparation, pre-assessment, and Window 1 scheduling.'}
              </li>
              <li>
                <strong>{isTl ? 'Proteksyon at Paggamit:' : 'Protection & Use:'}</strong>{' '}
                {isTl
                  ? 'Ang iyong password ay naka-encrypt (bcrypt), ang mga pribadong dokumento ay protektado ng role-based access, at ang iyong datos ay hindi ibebenta o ibabahagi sa ibang pribadong partido. Ginagamit lamang ang email mo para sa mga abiso ng aplikasyon, walk-in confirmation, at paalala ng renewal.'
                  : 'Passwords are encrypted (bcrypt), private documents are protected by role-based access control, and your data is never sold or shared with commercial third parties. Your email is used solely for application updates, walk-in confirmations, and renewal reminders.'}
              </li>
              <li>
                <strong>{isTl ? 'Karapatan ng Gumagamit:' : 'Your Rights:'}</strong>{' '}
                {isTl
                  ? 'Sa ilalim ng Data Privacy Act of 2012 (RA 10173), may karapatan kang tingnan, itama, o hilinging burahin ang iyong account at datos sa pamamagitan ng pag-contact sa BPLO Roxas.'
                  : 'Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the right to access, correct, or request deletion of your personal and business data by contacting BPLO Roxas.'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.9rem 1.4rem',
          borderTop: '1px solid #DCE5DF',
          backgroundColor: '#F8FAF8',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.6rem',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: '42px', padding: '0.5rem 1.1rem', borderRadius: '8px',
              border: '1.5px solid #8FA397', backgroundColor: '#FFFFFF',
              color: '#14532D', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
            }}
          >
            {isTl ? 'Isara' : 'Close'}
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => { onAccept(); onClose(); }}
              style={{
                minHeight: '42px', padding: '0.5rem 1.25rem', borderRadius: '8px',
                border: '1.5px solid #14532D', backgroundColor: '#14532D',
                color: '#FFFFFF', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
              }}
            >
              {isTl ? 'Sumasang-ayon Ako' : 'I Agree & Accept'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsPrivacyModal;

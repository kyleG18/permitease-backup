import React, { useState, useEffect } from 'react';
import { 
  X, ExternalLink, Copy, Check, MapPin, Phone, Mail, 
  FileText, HelpCircle, Shield, AlertTriangle, BookOpen, 
  Bell, ChevronDown, ChevronUp, Send, CheckCircle2, Info
} from 'lucide-react';

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState(null);

  // Bug Report Form State
  const [bugForm, setBugForm] = useState({
    category: 'Display / UI Issue',
    page: 'Landing Page',
    description: '',
    submitted: false
  });

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  // Copy to clipboard helper
  const copyToClipboard = (text, key, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      showToast(`Copied ${label || text} to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => {
      showToast(`Failed to copy to clipboard`);
    });
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSmoothScroll = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBugSubmit = (e) => {
    e.preventDefault();
    if (!bugForm.description.trim()) {
      showToast('Please provide a short description.');
      return;
    }
    setBugForm(prev => ({ ...prev, submitted: true }));
    showToast('Bug report prepared! Click below to send email if needed.');
  };

  return (
    <footer id="about" className="site-footer">
      <style>{`
        .site-footer {
          background: linear-gradient(180deg, #0F4A28 0%, #0A361D 100%);
          color: #ffffff;
          padding: 4rem 5% 1.5rem 5%;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border-top: 3px solid #16A34A;
          position: relative;
        }

        .site-footer a, .site-footer button.link-btn {
          color: #C2D1C2;
          text-decoration: none;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .site-footer a:hover, .site-footer button.link-btn:hover {
          color: #86EFAC;
          transform: translateX(3px);
        }

        .footer-container {
          max-width: 1240px;
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2.2fr 1fr 1fr 1.6fr;
          gap: 3rem;
          padding-bottom: 3rem;
        }

        .footer-col-header {
          color: #4ADE80;
          font-size: 0.875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 1.25rem;
          position: relative;
          display: inline-block;
          border-bottom: 2px solid rgba(74, 222, 128, 0.45);
          padding-bottom: 0.25rem;
        }

        .footer-link-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .footer-link-item a, .footer-link-item button.link-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        /* Column 1 Branding */
        .brand-header-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .brand-logo-img {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #ffffff;
          padding: 2px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
          flex-shrink: 0;
        }

        .brand-gov-title {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.75);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1.35;
          font-weight: 600;
        }

        .brand-lgu-name {
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }

        .portal-brand-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.75rem 0 1rem 0;
          flex-wrap: wrap;
        }

        .portal-title {
          font-size: 1.5rem;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .portal-title-highlight {
          color: #4ADE80;
        }

        .portal-badge {
          background-color: #16A34A;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .brand-description {
          color: #C2D1C2;
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0 0 1.25rem 0;
          max-width: 90%;
        }

        /* Action Buttons */
        .social-btn-fb {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          transition: all 0.25s ease;
          cursor: pointer;
        }

        .social-btn-fb:hover {
          background: #1877F2;
          color: #ffffff !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(24, 119, 242, 0.35);
          border-color: #1877F2;
        }

        /* Column 4 Contacts */
        .contact-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          font-size: 0.875rem;
          line-height: 1.45;
          color: #C2D1C2;
        }

        .contact-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4ADE80;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .contact-item a, .contact-item button.contact-copy-btn {
          color: #C2D1C2;
          text-decoration: none;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          text-align: left;
        }

        .contact-item a:hover, .contact-item button.contact-copy-btn:hover {
          color: #86EFAC;
        }

        /* Bottom Bar */
        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.815rem;
          color: #C2D1C2;
        }

        /* Modal Backdrop & Container */
        .footer-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(7, 24, 15, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }

        .footer-modal-card {
          background: #ffffff;
          color: #0F172A;
          border-radius: 12px;
          width: 100%;
          max-width: 640px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          border: 1px solid #E2E8F0;
          position: relative;
          display: flex;
          flex-direction: column;
          animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .footer-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: #0B2C1D;
          color: #ffffff;
          border-top-left-radius: 11px;
          border-top-right-radius: 11px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .footer-modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
        }

        .footer-modal-close {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .footer-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .footer-modal-body {
          padding: 1.5rem;
          font-size: 0.95rem;
          line-height: 1.65;
          color: #334155;
        }

        .footer-modal-footer {
          padding: 1rem 1.5rem;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          border-bottom-left-radius: 11px;
          border-bottom-right-radius: 11px;
        }

        /* Toast notification */
        .footer-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #0B2C1D;
          color: #86EFAC;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          border: 1px solid #16A34A;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          font-weight: 600;
          z-index: 100000;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2.5rem;
          }
          .brand-description {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .site-footer {
            padding: 3rem 6% 1.5rem 6%;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 2.25rem;
          }
          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="footer-toast">
          <CheckCircle2 size={18} color="#4ADE80" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="footer-container">
        {/* ── 4-COLUMN MAIN FOOTER CONTENT ── */}
        <div className="footer-grid">

          {/* Column 1: Brand & Description */}
          <div>
            <div className="brand-header-wrap">
              <img
                src="/images/roxas-seal.png"
                alt="Roxas Official Seal"
                className="brand-logo-img"
              />
              <div>
                <div className="brand-gov-title">
                  Republic of the Philippines<br />
                  Province of Oriental Mindoro
                </div>
                <div className="brand-lgu-name">
                  Municipality of Roxas
                </div>
                <div style={{ fontSize: '0.68rem', color: '#86EFAC', fontWeight: '700', letterSpacing: '0.08em', marginTop: '2px' }}>
                  ORIENTAL MINDORO &bull; EST. 1948
                </div>
              </div>
            </div>

            <div className="portal-brand-banner">
              <div className="portal-title">
                Permit<span className="portal-title-highlight">Ease</span>
              </div>
              <span className="portal-badge">
                BPLO Portal
              </span>
            </div>

            <p className="brand-description">
              Serving our citizens with transparency, efficiency, and dedication. Your gateway to business permit clearance guidance, requirements tracking, and pre-assessment support.
            </p>

            {/* Action buttons matching official Roxas site */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveModal('visit')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)'; e.currentTarget.style.borderColor = '#4ADE80'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)'; }}
              >
                <MapPin size={14} color="#86EFAC" />
                Visit Us
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('emergency')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#A7232C',
                  border: '1px solid #A7232C',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(167, 35, 44, 0.35)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B1820'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A7232C'}
              >
                <Phone size={14} color="#ffffff" />
                Emergency
              </button>

              <a
                href="https://facebook.com/profile.php?id=100064927246650"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn-fb"
                aria-label="Official BPLO Roxas Facebook Page"
                title="BPLO Roxas Ormin Facebook Page"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: QUICK LINKS */}
          <div>
            <div className="footer-col-header">Quick Links</div>
            <ul className="footer-link-list">
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Home
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('about')}>
                  About Us
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => handleSmoothScroll('services')}>
                  Services
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('announcements')}>
                  Announcements
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('faq')}>
                  FAQ
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('contact')}>
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: HELP & SUPPORT */}
          <div>
            <div className="footer-col-header">Help &amp; Support</div>
            <ul className="footer-link-list">
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('guide')}>
                  User Guide
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('privacy')}>
                  Privacy Policy
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('terms')}>
                  Terms of Use
                </button>
              </li>
              <li className="footer-link-item">
                <button type="button" className="link-btn" onClick={() => setActiveModal('bug')}>
                  Report a Bug
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: CONNECT WITH US */}
          <div>
            <div className="footer-col-header">Connect With Us</div>
            <ul className="contact-list">
              {/* Location */}
              <li className="contact-item">
                <span className="contact-icon-box" aria-hidden="true">
                  <MapPin size={18} />
                </span>
                <button
                  type="button"
                  className="contact-copy-btn"
                  title="Click to view location and Google Maps"
                  onClick={() => setActiveModal('visit')}
                >
                  <span>Municipality of Roxas, Oriental Mindoro</span>
                  <ExternalLink size={12} style={{ opacity: 0.6 }} />
                </button>
              </li>

              {/* Phone / Mobile */}
              <li className="contact-item">
                <span className="contact-icon-box" aria-hidden="true">
                  <Phone size={18} />
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a href="tel:09158938768">09158938768</a>
                  <button
                    type="button"
                    className="contact-copy-btn"
                    title="Copy phone number"
                    onClick={() => copyToClipboard('09158938768', 'phone', 'Phone number')}
                    style={{ opacity: 0.75 }}
                  >
                    {copiedKey === 'phone' ? <Check size={13} color="#4ADE80" /> : <Copy size={13} />}
                  </button>
                </div>
              </li>

              {/* Email */}
              <li className="contact-item">
                <span className="contact-icon-box" aria-hidden="true">
                  <Mail size={18} />
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a href="mailto:bplo.roxas20@yahoo.com">bplo.roxas20@yahoo.com</a>
                  <button
                    type="button"
                    className="contact-copy-btn"
                    title="Copy email address"
                    onClick={() => copyToClipboard('bplo.roxas20@yahoo.com', 'email', 'Email address')}
                    style={{ opacity: 0.75 }}
                  >
                    {copiedKey === 'email' ? <Check size={13} color="#4ADE80" /> : <Copy size={13} />}
                  </button>
                </div>
              </li>

              {/* Facebook Page / Messenger */}
              <li className="contact-item">
                <span className="contact-icon-box" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </span>
                <a
                  href="https://facebook.com/profile.php?id=100064927246650"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>BPLO Roxas Ormin</span>
                  <ExternalLink size={12} style={{ opacity: 0.6 }} />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── BOTTOM COPYRIGHT & MOTTO BAR ── */}
        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} Municipality of Roxas. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="link-btn"
              onClick={() => setActiveModal('security')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#C2D1C2', fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '600' }}
            >
              <Shield size={13} color="#4ADE80" />
              <span>SECURE &amp; ACCESSIBLE</span>
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Back to top"
              title="Back to top"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0B3B24',
                border: '1px solid rgba(74, 222, 128, 0.4)',
                color: '#4ADE80',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '800',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#16A34A'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0B3B24'; e.currentTarget.style.color = '#4ADE80'; }}
            >
              &#9650;
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          INTERACTIVE FOOTER MODALS SYSTEM
      ══════════════════════════════════════════════════════════════════════ */}
      {activeModal && (
        <div className="footer-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="footer-modal-card" onClick={(e) => e.stopPropagation()}>

            {/* 1. VISIT US MODAL */}
            {activeModal === 'visit' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <MapPin size={20} color="#4ADE80" />
                    Visit Municipal Hall &amp; BPLO
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <div style={{ backgroundColor: '#F0FDF4', borderLeft: '4px solid #16A34A', padding: '1rem', borderRadius: '4px', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: '700', color: '#166534', marginBottom: '0.25rem' }}>Business Permit &amp; Licensing Office (BPLO)</div>
                    <div style={{ fontSize: '0.9rem', color: '#374151' }}>Ground Floor, Municipal Hall Compound, Poblacion, Roxas, Oriental Mindoro, 5212</div>
                  </div>

                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0F172A', fontSize: '1rem', fontWeight: '700' }}>Operating Hours</h4>
                  <ul style={{ margin: '0 0 1.25rem 0', paddingLeft: '1.25rem', color: '#475569', fontSize: '0.9rem' }}>
                    <li><strong>Monday to Friday:</strong> 8:00 AM &ndash; 5:00 PM</li>
                    <li><strong>No Noon Break:</strong> Frontline services remain open during lunch hours.</li>
                    <li><strong>Weekends &amp; Holidays:</strong> Closed (Online preparation via PermitEase remains available 24/7).</li>
                  </ul>

                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0F172A', fontSize: '1rem', fontWeight: '700' }}>Frontline Counters at Roxas BOSS</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '700', color: '#0B2C1D' }}>Counter 1:</span> Verification &amp; Document Review
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '700', color: '#0B2C1D' }}>Counter 2:</span> Municipal Tax &amp; Fee Assessment
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '700', color: '#0B2C1D' }}>Counter 3:</span> Cashier / Payment (Treasury)
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '700', color: '#0B2C1D' }}>Counter 4:</span> Releasing of Mayor&apos;s Permit &amp; Plate
                    </div>
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}
                  >
                    Close
                  </button>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Municipal+Hall+Roxas+Oriental+Mindoro"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', background: '#16A34A', color: '#ffffff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    <MapPin size={15} />
                    Open in Google Maps
                    <ExternalLink size={13} />
                  </a>
                </div>
              </>
            )}

            {/* 2. EMERGENCY HOTLINES MODAL */}
            {activeModal === 'emergency' && (
              <>
                <div className="footer-modal-header" style={{ background: '#991B1B' }}>
                  <div className="footer-modal-title">
                    <AlertTriangle size={20} color="#FCA5A5" />
                    Roxas Emergency Numbers &amp; Hotlines
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.9rem' }}>
                    For immediate municipal assistance, fire emergency, police rescue, or health transport in Roxas, Oriental Mindoro:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { agency: 'BPLO Citizen Assistance Hotline', number: '09158938768', desc: 'PermitEase support & BPLO inquiries' },
                      { agency: 'MDRRMO Rescue (Disaster Command)', number: '09178001234', desc: 'Medical emergencies, floods, typhoon rescue' },
                      { agency: 'Bureau of Fire Protection (BFP Roxas)', number: '09156022115', desc: 'Fire alarms, building safety emergencies' },
                      { agency: 'Philippine National Police (PNP Roxas Station)', number: '09985986080', desc: 'Law enforcement, peace and order, crime reporting' },
                      { agency: 'Rural Health Unit (RHU Clinic & Ambulance)', number: '09271234567', desc: 'Health center, emergency clinic transport' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: '700', color: '#991B1B', fontSize: '0.95rem' }}>{item.agency}</div>
                          <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{item.desc}</div>
                          <div style={{ color: '#1E293B', fontWeight: '800', fontSize: '1rem', marginTop: '2px' }}>{item.number}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.number, `hotline-${idx}`, item.agency)}
                            style={{ padding: '0.45rem 0.75rem', background: '#ffffff', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#475569' }}
                          >
                            {copiedKey === `hotline-${idx}` ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                            Copy
                          </button>
                          <a
                            href={`tel:${item.number}`}
                            style={{ padding: '0.45rem 0.95rem', background: '#DC2626', color: '#ffffff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Phone size={13} />
                            Call Now
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 3. ABOUT US MODAL */}
            {activeModal === 'about' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <Info size={20} color="#4ADE80" />
                    About PermitEase &amp; BPLO Roxas
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <p style={{ marginTop: 0 }}>
                    <strong>PermitEase</strong> is the official business permit preparation and support platform of the 
                    <strong> Municipality of Roxas, Oriental Mindoro</strong>. Built pursuant to 
                    Republic Act No. 11032 (<em>Ease of Doing Business and Efficient Government Service Delivery Act of 2018</em>), 
                    the portal empowers micro, small, and medium enterprises (MSMEs) to prepare required clearances and calculate fee estimates before visiting the BPLO.
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1.25rem 0 0.5rem 0' }}>Our Key Objectives</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569' }}>
                    <li><strong>Transparent Fee Estimations:</strong> Eliminate unexpected costs with deterministic calculations based on the municipal tax code.</li>
                    <li><strong>Readiness Tracking:</strong> Identify missing regulatory clearances (Barangay, DTI/SEC, Sanitary, FSIC) before counter submission.</li>
                    <li><strong>Unified Application Form:</strong> Generate standardized permit preparation packets compliant with national DILG-DICT-DTI guidelines.</li>
                    <li><strong>Reduced Counter Processing Time:</strong> Transform hours of counter queuing into a fast, pre-verified clearance handoff.</li>
                  </ul>

                  <div style={{ marginTop: '1.25rem', background: '#F0FDF4', padding: '1rem', borderRadius: '8px', border: '1px solid #BBF7D0', fontSize: '0.88rem', color: '#166534' }}>
                    <strong>Note:</strong> PermitEase is a preparation and pre-assessment system. Final Mayor&apos;s Permit issuance, official payment receipts, and business plates are granted by the BPLO after in-person counter review.
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Got It
                  </button>
                </div>
              </>
            )}

            {/* 4. ANNOUNCEMENTS MODAL */}
            {activeModal === 'announcements' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <Bell size={20} color="#4ADE80" />
                    BPLO Advisories &amp; Announcements
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#F8FAFC', borderLeft: '4px solid #16A34A', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advisory &bull; Renewal Season</span>
                      <h4 style={{ margin: '0.25rem 0 0.5rem 0', color: '#0F172A', fontSize: '1rem' }}>Annual Business Permit Renewal Period</h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                        All existing businesses operating in Roxas are required to renew their Mayor&apos;s Permits between <strong>January 2 and January 20</strong>. Applications received after January 20 will incur statutory 25% surcharges and 2% monthly interest under the Local Government Code.
                      </p>
                    </div>

                    <div style={{ padding: '1rem', background: '#F8FAFC', borderLeft: '4px solid #2563EB', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notice &bull; Health Inspection</span>
                      <h4 style={{ margin: '0.25rem 0 0.5rem 0', color: '#0F172A', fontSize: '1rem' }}>Sanitary Permit &amp; Health Certificate Processing</h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                        All food-handling and commercial service personnel must complete their physical examination and chest X-ray at the Rural Health Unit (RHU) before securing Sanitary Clearance.
                      </p>
                    </div>

                    <div style={{ padding: '1rem', background: '#F8FAFC', borderLeft: '4px solid #D97706', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notice &bull; Fire Safety</span>
                      <h4 style={{ margin: '0.25rem 0 0.5rem 0', color: '#0F172A', fontSize: '1rem' }}>BFP Joint Inspection Schedule</h4>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                        Bureau of Fire Protection (BFP) officers are co-located at the BPLO BOSS counter. Make sure your commercial establishment is equipped with serviceable fire extinguishers.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 5. FAQ MODAL */}
            {activeModal === 'faq' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <HelpCircle size={20} color="#4ADE80" />
                    Frequently Asked Questions (FAQ)
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      {
                        q: 'Who is required to secure a Mayor\'s Business Permit in Roxas?',
                        a: 'Any person, corporation, partnership, or cooperative conducting commercial, industrial, or service operations within the territorial jurisdiction of the Municipality of Roxas must obtain a valid Mayor\'s Permit prior to operating.'
                      },
                      {
                        q: 'What is the difference between a New Application and a Renewal?',
                        a: 'New applications require registration documents (DTI/SEC/CDA), Barangay Business Clearance, Lease Contract or Proof of Property Ownership, and initial Sanitary/Fire clearances. Renewals require the previous year\'s Mayor\'s Permit and certified Gross Sales/Receipts declaration for the preceding tax year.'
                      },
                      {
                        q: 'Can I complete my permit application entirely online?',
                        a: 'PermitEase functions as your digital pre-assessment and preparation companion. You can verify your requirements checklist, estimate municipal taxes and regulatory fees, and download your Unified Application Form. Physical verification and fee payment take place at the BPLO counter.'
                      },
                      {
                        q: 'How are local business taxes calculated?',
                        a: 'Business taxes are calculated using graduated tax brackets based on your declared gross sales/receipts and municipal line-of-business schedules specified in the Roxas Municipal Revenue Code and Tax Ordinance.'
                      },
                      {
                        q: 'What happens if I miss the January 20 renewal deadline?',
                        a: 'Applications filed after January 20 incur a statutory 25% surcharge on total business taxes plus a 2% monthly interest on unpaid obligations pursuant to Section 168 of the Local Government Code.'
                      }
                    ].map((faq, idx) => (
                      <div 
                        key={idx} 
                        style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}
                      >
                        <button
                          type="button"
                          onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.85rem 1rem',
                            background: faqOpenIndex === idx ? '#F0FDF4' : '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            color: faqOpenIndex === idx ? '#166534' : '#1E293B',
                            gap: '0.5rem'
                          }}
                        >
                          <span>{faq.q}</span>
                          {faqOpenIndex === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {faqOpenIndex === idx && (
                          <div style={{ padding: '0.85rem 1rem', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                            {faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 6. CONTACT US MODAL */}
            {activeModal === 'contact' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <Mail size={20} color="#4ADE80" />
                    Contact BPLO Roxas
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</div>
                      <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>0915 893 8768</div>
                      <a href="tel:09158938768" style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: '600', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}>Click to call &rarr;</a>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</div>
                      <div style={{ fontWeight: '800', color: '#0F172A', marginTop: '2px', wordBreak: 'break-all' }}>bplo.roxas20@yahoo.com</div>
                      <a href="mailto:bplo.roxas20@yahoo.com" style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: '600', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}>Compose email &rarr;</a>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#0F172A', fontSize: '0.95rem' }}>Send a Quick Inquiry</h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const subject = encodeURIComponent(e.target.subject.value || 'PermitEase Inquiry');
                    const body = encodeURIComponent(e.target.message.value || '');
                    window.location.href = `mailto:bplo.roxas20@yahoo.com?subject=${subject}&body=${body}`;
                    showToast('Opening your default mail client...');
                  }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>Subject</label>
                      <input 
                        name="subject" 
                        type="text" 
                        placeholder="e.g. Question regarding Sari-sari Store Sanitary Permit" 
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        required 
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.25rem' }}>Message</label>
                      <textarea 
                        name="message" 
                        rows={3} 
                        placeholder="Please include your business name and specific question..." 
                        style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                        required 
                      />
                    </div>
                    <button
                      type="submit"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', background: '#16A34A', color: '#ffffff', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      <Send size={14} /> Send Inquiry via Email
                    </button>
                  </form>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 7. USER GUIDE MODAL */}
            {activeModal === 'guide' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <BookOpen size={20} color="#4ADE80" />
                    PermitEase Citizen User Guide
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { step: '01', title: 'Create Account & Business Profile', desc: 'Sign up for a free business owner account and register your enterprise information (capitalization, line of business, employee count, and location).' },
                      { step: '02', title: 'Check Requirements & Upload Files', desc: 'View your tailored permit checklist based on Roxas requirements (Barangay Clearance, DTI/SEC, Sanitary, Fire Inspection).' },
                      { step: '03', title: 'Simulate Estimated Taxes & Fees', desc: 'Use the pre-assessment module to review an itemized estimate of business taxes and municipal clearance fees before counter payment.' },
                      { step: '04', title: 'Download Unified Form & Submit', desc: 'Print or download your pre-filled Unified Application Form packet and present it at the BPLO BOSS counter for prompt issuance.' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#16A34A', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>
                          {item.step}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{item.title}</div>
                          <div style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Got It
                  </button>
                </div>
              </>
            )}

            {/* 8. PRIVACY POLICY MODAL */}
            {activeModal === 'privacy' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <Shield size={20} color="#4ADE80" />
                    Data Privacy Policy
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <p style={{ marginTop: 0 }}>
                    The <strong>Municipality of Roxas, Oriental Mindoro</strong> is strictly committed to protecting the privacy and personal data of citizens in compliance with 
                    <strong> Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and its Implementing Rules and Regulations.
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1rem 0 0.35rem 0' }}>1. Information We Collect</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    We collect business owner names, contact numbers, email addresses, tax identification numbers (TIN), business registration details, and gross sales declarations strictly for municipal permit processing and tax assessment.
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1rem 0 0.35rem 0' }}>2. Use of Information</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    Collected data is used solely to verify permit requirements, calculate statutory local taxes and regulatory fees, deliver renewal notifications, and maintain official government records.
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1rem 0 0.35rem 0' }}>3. Data Protection and Confidentiality</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    All stored records are encrypted and protected by role-based access controls. We do not sell, disclose, or distribute applicant data to unauthorized third parties or commercial entities.
                  </p>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    I Understand
                  </button>
                </div>
              </>
            )}

            {/* 9. TERMS OF USE MODAL */}
            {activeModal === 'terms' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <FileText size={20} color="#4ADE80" />
                    Terms of Use &amp; Service
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <p style={{ marginTop: 0 }}>
                    Welcome to <strong>PermitEase</strong>. By accessing or using this online portal, you agree to comply with and be bound by the following municipal terms of service:
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1rem 0 0.35rem 0' }}>1. Scope of Service</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    PermitEase serves as an electronic document preparation, checklist verification, and fee estimation platform. Generating a summary document through this portal does not substitute for an officially signed and sealed Mayor&apos;s Permit.
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1rem 0 0.35rem 0' }}>2. Accuracy of Declarations</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    Applicants attest under penalty of perjury that all submitted information, gross revenue declarations, and uploaded clearance certificates are true, correct, and legally obtained.
                  </p>

                  <h4 style={{ color: '#0B2C1D', margin: '1rem 0 0.35rem 0' }}>3. Official Release</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                    Official business plates, Mayor&apos;s Permit certificates, and official payment receipts are only issued upon counter verification and receipt of full payment by the Municipal Treasurer.
                  </p>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Accept
                  </button>
                </div>
              </>
            )}

            {/* 10. REPORT A BUG MODAL */}
            {activeModal === 'bug' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <AlertTriangle size={20} color="#FBBF24" />
                    Report a Bug / System Feedback
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  {bugForm.submitted ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      <CheckCircle2 size={48} color="#16A34A" style={{ margin: '0 auto 1rem auto' }} />
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#0F172A' }}>Feedback Recorded!</h3>
                      <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Thank you for helping us improve PermitEase for the Municipality of Roxas. If you have screenshots or logs, you can also email the technical team directly.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <a
                          href={`mailto:bplo.roxas20@yahoo.com?subject=${encodeURIComponent(`[Bug Report] ${bugForm.category}`)}&body=${encodeURIComponent(`Page: ${bugForm.page}\nDescription: ${bugForm.description}`)}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: '#16A34A', color: '#ffffff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '0.85rem' }}
                        >
                          <Mail size={15} /> Send via Email Client
                        </a>
                        <button
                          type="button"
                          onClick={() => setBugForm({ category: 'Display / UI Issue', page: 'Landing Page', description: '', submitted: false })}
                          style={{ padding: '0.6rem 1.1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}
                        >
                          Report Another
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBugSubmit}>
                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>Category</label>
                        <select
                          value={bugForm.category}
                          onChange={(e) => setBugForm({ ...bugForm, category: e.target.value })}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                        >
                          <option>Display / UI Issue</option>
                          <option>Fee Calculation Bug</option>
                          <option>Document Upload Problem</option>
                          <option>Login / Account Access</option>
                          <option>Mobile Responsiveness Glitch</option>
                          <option>Other Feedback</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>Page or Section</label>
                        <input
                          type="text"
                          value={bugForm.page}
                          onChange={(e) => setBugForm({ ...bugForm, page: e.target.value })}
                          placeholder="e.g. Tax & Fee Estimation page, Mobile Header, etc."
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                          required
                        />
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem' }}>Detailed Description</label>
                        <textarea
                          rows={4}
                          value={bugForm.description}
                          onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                          placeholder="Please describe what happened, expected behavior, or steps to reproduce..."
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          style={{ padding: '0.55rem 1.1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', color: '#475569' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', background: '#16A34A', color: '#ffffff', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          <Send size={14} /> Submit Bug Report
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}

            {/* 11. SECURITY & ACCESSIBILITY MODAL */}
            {activeModal === 'security' && (
              <>
                <div className="footer-modal-header">
                  <div className="footer-modal-title">
                    <Shield size={20} color="#4ADE80" />
                    Security &amp; Accessibility Standards
                  </div>
                  <button className="footer-modal-close" onClick={() => setActiveModal(null)} title="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="footer-modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.5rem', background: '#F0FDF4', borderRadius: '8px', color: '#16A34A', flexShrink: 0 }}>
                        <Shield size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '0.95rem' }}>256-Bit SSL/TLS Encryption</div>
                        <div style={{ color: '#475569', fontSize: '0.88rem' }}>All transmissions between citizen devices and municipal servers are protected with industry-standard cryptographic encryption.</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.5rem', background: '#EFF6FF', borderRadius: '8px', color: '#2563EB', flexShrink: 0 }}>
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '0.95rem' }}>Role-Based Access Control (RBAC)</div>
                        <div style={{ color: '#475569', fontSize: '0.88rem' }}>Zero cross-tenant data leakage. Business owners can only view and modify their own registered enterprises and permit records.</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.5rem', background: '#FDF4FF', borderRadius: '8px', color: '#C026D3', flexShrink: 0 }}>
                        <Info size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#0F172A', fontSize: '0.95rem' }}>WCAG 2.1 AA Accessibility Conformance</div>
                        <div style={{ color: '#475569', fontSize: '0.88rem' }}>Designed with responsive typography, high-contrast civic color palettes, bilingual Tagalog/English support, and mobile-friendly tap targets.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="footer-modal-footer">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    style={{ padding: '0.55rem 1.25rem', background: '#16A34A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </footer>
  );
};

export default Footer;

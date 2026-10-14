import React from 'react';

const Footer = () => {
  return (
    <footer id="about" className="site-footer">
      <style>{`
        .site-footer {
          background: linear-gradient(180deg, #0F4A28 0%, #0A361D 100%);
          color: #ffffff;
          padding: 4rem 5% 1.5rem 5%;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          border-top: 3px solid #16A34A;
        }

        .site-footer a {
          color: rgba(255, 255, 255, 0.82);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .site-footer a:hover {
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
        }

        .footer-link-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .footer-link-item a {
          display: inline-flex;
          align-items: center;
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
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0 0 1.25rem 0;
          max-width: 90%;
        }

        /* Social Button */
        .social-btn-wrap {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .social-btn-fb {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
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
          color: rgba(255, 255, 255, 0.85);
        }

        .contact-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FBBF24; /* Warm golden icon to mirror reference */
          margin-top: 2px;
          flex-shrink: 0;
        }

        .contact-item a {
          color: rgba(255, 255, 255, 0.85);
        }

        .contact-item a:hover {
          color: #86EFAC;
        }

        /* Bottom Bar */
        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          padding-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.815rem;
          color: rgba(255, 255, 255, 0.65);
        }

        .footer-tagline-text {
          font-style: italic;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
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
              PermitEase is the official business permit preparation and support platform of the Municipality of Roxas, Oriental Mindoro for citizen clearance guidance, requirements tracking, and pre-assessment support.
            </p>

            {/* Social media action button linking to Facebook */}
            <div className="social-btn-wrap">
              <a
                href="https://facebook.com/profile.php?id=100064927246650"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn-fb"
                aria-label="Official BPLO Roxas Facebook Page"
                title="BPLO Roxas Ormin Facebook Page"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                <a href="#">Home</a>
              </li>
              <li className="footer-link-item">
                <a href="#how-it-works">About Us</a>
              </li>
              <li className="footer-link-item">
                <a href="#services">Services</a>
              </li>
              <li className="footer-link-item">
                <a href="#services">Announcements</a>
              </li>
              <li className="footer-link-item">
                <a href="#how-it-works">FAQ</a>
              </li>
              <li className="footer-link-item">
                <a href="#about">Contact Us</a>
              </li>
            </ul>
          </div>

          {/* Column 3: HELP & SUPPORT */}
          <div>
            <div className="footer-col-header">Help &amp; Support</div>
            <ul className="footer-link-list">
              <li className="footer-link-item">
                <a href="#how-it-works">User Guide</a>
              </li>
              <li className="footer-link-item">
                <a href="#about">Privacy Policy</a>
              </li>
              <li className="footer-link-item">
                <a href="#about">Terms of Use</a>
              </li>
              <li className="footer-link-item">
                <a href="mailto:bplo.roxas20@yahoo.com?subject=PermitEase%20Bug%20Report">Report a Bug</a>
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span>Municipality of Roxas, Oriental Mindoro</span>
              </li>

              {/* Phone / Mobile */}
              <li className="contact-item">
                <span className="contact-icon-box" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <a href="tel:09158938768">09158938768</a>
              </li>

              {/* Email */}
              <li className="contact-item">
                <span className="contact-icon-box" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <a href="mailto:bplo.roxas20@yahoo.com">bplo.roxas20@yahoo.com</a>
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
                >
                  BPLO Roxas Ormin
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── BOTTOM COPYRIGHT & MOTTO BAR ── */}
        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} Municipality of Roxas, Oriental Mindoro. All rights reserved.
          </div>
          <div className="footer-tagline-text">
            Roxas: A Municipality of Progress and Opportunity
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

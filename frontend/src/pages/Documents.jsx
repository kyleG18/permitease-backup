import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FolderOpen, Upload, Trash2, Download, X, FileText, Image as ImageIcon, Paperclip, Building2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;

const Documents = () => {
  const { user, token } = useContext(AuthContext);
  const activeToken = token || user?.token;
  const [documents, setDocuments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [selectedBizFilter, setSelectedBizFilter] = useState('ALL');

  const handleDownload = async (docId, docName) => {
    try {
      const res = await fetch(`${API}/documents/download/${docId}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) {
        alert('Failed to download document.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document.');
    }
  };

  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ business_id: '', document_name: '', expiration_date: '' });
  const [file, setFile] = useState(null);

  const config = { headers: { Authorization: `Bearer ${activeToken}` } };

  const fetchData = async () => {
    try {
      const [docsRes, bizsRes] = await Promise.all([
        axios.get(`${API}/documents`, config),
        axios.get(`${API}/businesses`, config)
      ]);
      setDocuments(docsRes.data);
      setBusinesses(bizsRes.data);
    } catch (err) { setError('Failed to load documents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('business_id', formData.business_id);
      uploadData.append('document_name', formData.document_name);
      uploadData.append('expiration_date', formData.expiration_date);
      await axios.post(`${API}/documents/upload`, uploadData, {
        headers: { Authorization: `Bearer ${activeToken}`, 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false); setFile(null); setFormData({ business_id: '', document_name: '', expiration_date: '' }); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await axios.delete(`${API}/documents/${id}`, config); fetchData(); }
    catch (err) { setError('Failed to delete'); }
  };

  const renderFileIcon = (path) => {
    if (path?.toLowerCase().endsWith('.pdf')) return <FileText size={18} color="#15803D" />;
    if (path?.toLowerCase().match(/\.(jpg|jpeg|png)$/)) return <ImageIcon size={18} color="#1D4ED8" />;
    return <Paperclip size={18} color="#475569" />;
  };

  const getExpirationBadge = (expDate) => {
    if (!expDate) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '5px', backgroundColor: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600 }}>
          No Expiry Recorded
        </span>
      );
    }
    const exp = new Date(expDate);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '5px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: 700 }}>
          <AlertTriangle size={12} /> Expired ({exp.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })})
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '5px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 700 }}>
          <Calendar size={12} /> Expiring {exp.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', borderRadius: '5px', backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: 700 }}>
        <CheckCircle size={12} /> Valid until {exp.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    );
  };

  const filteredDocuments = selectedBizFilter === 'ALL'
    ? documents
    : documents.filter(d => String(d.business_id) === String(selectedBizFilter));

  return (
    <div className="animate-fade-in page-container">
      <div className="municipal-page-header">
        <div>
          <div className="municipal-page-kicker">Municipality of Roxas · Document Repository</div>
          <h1 className="municipal-page-title">Permit Documents & Clearances</h1>
          <p className="municipal-page-subtitle">Upload, verify validity dates, and organize your prerequisite clearances before visiting Window 1.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {businesses.length > 1 && (
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '200px', padding: '0.45rem 0.85rem', fontSize: '13px', fontWeight: 600 }}
              value={selectedBizFilter}
              onChange={(e) => setSelectedBizFilter(e.target.value)}
            >
              <option value="ALL">All Businesses ({documents.length})</option>
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.business_name}</option>
              ))}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Upload size={16} /> Upload Document
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--danger-light)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #FECACA', fontSize: '13px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted text-center" style={{ padding: '4rem' }}>Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={44} className="empty-state__icon" style={{ color: 'var(--text-muted)' }} />
          <h3 className="empty-state__title">No Documents Uploaded Yet</h3>
          <p className="empty-state__desc">Upload your Barangay Business Clearance, DTI/SEC Certificate, Fire Safety Inspection Certificate, and other required clearances.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Upload size={16} /> Upload Document
          </button>
        </div>
      ) : (
        <div className="municipal-table-card">
          <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FolderOpen size={16} color="#15803D" /> Uploaded Clearance & Requirement Files
            </div>
            <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <div className="table-responsive">
            <table className="municipal-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Associated Business</th>
                  <th>Date Uploaded</th>
                  <th>Validity / Expiration</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '6px',
                          backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {renderFileIcon(doc.file_path)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>{doc.document_name}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            {doc.file_path?.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Image Attachment'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                        <Building2 size={13} color="#64748B" />
                        {doc.business_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="tabular-nums" style={{ fontSize: '12.5px', color: '#475569' }}>
                      {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      {getExpirationBadge(doc.expiration_date)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                        <button
                          onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name); }}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '12px' }}
                        >
                          <Download size={13} /> View / Download
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="btn btn-sm"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                          title="Delete document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card modal-content document-upload-modal" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>Upload Clearance Document</h2>
                <p style={{ margin: '0.15rem 0 0', fontSize: '12px', color: '#64748B' }}>Attach PDF or image copies of your regulatory requirements.</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <select className="form-control" style={{ paddingTop: '0.75rem' }} value={formData.business_id} onChange={e => setFormData({...formData, business_id: e.target.value})} required>
                  <option value="">Select Business</option>
                  {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                </select>
                <label className="form-label" style={{ top: '0.4rem', fontSize: '0.75rem', color: 'var(--primary-green)' }}>Business *</label>
              </div>
              <div className="form-group">
                <input className="form-control" placeholder=" " value={formData.document_name} onChange={e => setFormData({...formData, document_name: e.target.value})} required />
                <label className="form-label">Document Name (e.g., Barangay Clearance) *</label>
              </div>
              <div className="form-group">
                <input className="form-control" type="date" placeholder=" " value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} />
                <label className="form-label">Expiration Date (optional)</label>
              </div>
              <div style={{ position: 'relative', border: '1.5px dashed #CBD5E1', borderRadius: '8px', padding: '1.75rem 1.25rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer', background: '#F8FAFC' }}>
                <FileText size={28} style={{ color: '#15803D', margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#0F172A', fontWeight: 600, fontSize: '13.5px', marginBottom: '0.25rem' }}>{file ? file.name : 'Click or drag to select a document file'}</p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>PDF, JPG, or PNG formats supported</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;

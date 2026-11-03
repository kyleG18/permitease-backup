import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Library, Upload, Trash2, X, FileText, ExternalLink } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

const KnowledgeBase = () => {
  const { user } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const config = { headers: { Authorization: `Bearer ${user.token}` } };
  const isAdmin = user.role === 'lgu_admin' || user.role === 'system_admin';

  const fetchDocs = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/knowledge`);
      setDocs(data);
    } catch (err) { setError('Failed to load documents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) { setError('Please provide a title and a PDF file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/knowledge/upload`, formData, {
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false); setFile(null); setTitle(''); fetchDocs();
    } catch (err) { setError(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/knowledge/${id}`, config); fetchDocs(); }
    catch (err) { setError('Failed to delete'); }
  };

  return (
    <div className="animate-fade-in page-container" style={{ maxWidth: "1200px" }}>
      <div className="page-heading-row" style={{ marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#15803D" }}>MUNICIPAL REGULATORY ARCHIVE</span>
          <h1 style={{ color: "#0F172A", margin: "0.2rem 0 0.25rem", fontSize: "1.75rem", fontWeight: 800 }}>Knowledge Base</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: "0.875rem" }}>Reference documents, municipal revenue codes, and ordinances informing AI assessments and chatbot guidance.</p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ 
              backgroundColor: '#15803D', 
              borderColor: '#15803D',
              boxShadow: '0 2px 8px rgba(21,128,61,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700
            }}
          >
            <Upload size={18} /> Upload Document
          </button>
        )}
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--danger-light)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #FECACA' }}>{error}</div>}

      {!isAdmin && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#166534' }}>
          📚 These official municipal documents guide the AI in evaluating your permit requirements and fee calculations.
        </div>
      )}

      {loading ? <div className="text-muted text-center" style={{ padding: '4rem' }}>Loading documents...</div> :
        docs.length === 0 ? (
          <div className="empty-state">
            <Library size={48} className="empty-state__icon" style={{ color: '#94A3B8' }} />
            <h3 className="empty-state__title">Knowledge Base is Empty</h3>
            <p className="empty-state__desc">{isAdmin ? 'Upload municipal documents to help the AI Assistant answer permit questions.' : 'No municipal documents have been uploaded yet.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {docs.map(doc => (
              <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', borderRadius: "12px", border: "1px solid #E2E8F0", borderLeft: '4px solid #15803D', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', background: '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={20} color="#15803D" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.25rem 0 0' }}>{new Date(doc.uploaded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <a href={`${API_BASE}/uploads/${doc.document_path}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#166534', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontWeight: 700, textDecoration: 'none' }}>
                    <ExternalLink size={14} /> View PDF
                  </a>
                  {isAdmin && (
                    <button style={{ padding: '0.55rem 0.85rem', fontSize: '0.8rem', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => handleDelete(doc.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Upload to Knowledge Base</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <input className="form-control" placeholder=" " value={title} onChange={e => setTitle(e.target.value)} required />
                <label className="form-label">Document Title *</label>
              </div>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', background: '#FAFAFA', position: 'relative' }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{file ? file.name : 'Click to select a PDF file'}</p>
                <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: '#15803D', borderColor: '#15803D', boxShadow: '0 2px 8px rgba(21,128,61,0.25)' }} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

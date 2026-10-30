import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Library, Upload, Trash2, X, FileText, ExternalLink } from 'lucide-react';

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
    <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div><span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#15803D" }}>REGULATORY ARCHIVE</span><h1 style={{ color: "#0F172A", margin: "0.2rem 0 0.25rem", fontSize: "28px", fontWeight: 800 }}>Knowledge Base</h1></div>
          <p className="text-muted">Reference documents, ordinances, and guidelines used by the AI Assistant.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ backgroundColor: "#15803D", borderRadius: "8px", fontWeight: 700, boxShadow: "0 2px 6px rgba(21,128,61,0.25)" }}><Upload size={18} /> Upload Document</button>}
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--status-expired-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {!isAdmin && (
        <div style={{ background: 'var(--light-green)', border: '1px solid var(--secondary-green)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--primary-green)' }}>
          📚 These documents are used by the AI Assistant to answer permit-related questions. Contact your LGU Administrator to upload additional documents.
        </div>
      )}

      {loading ? <div className="text-muted text-center" style={{ padding: '4rem' }}>Loading...</div> :
        docs.length === 0 ? (
          <div className="card text-center" style={{ padding: '4rem' }}>
            <Library size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 className="text-muted">Knowledge Base is Empty</h3>
            <p className="text-muted">{isAdmin ? 'Upload documents to help the AI Assistant answer permit questions.' : 'No documents have been uploaded yet.'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {docs.map(doc => (
              <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: '#FEF3C7', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    📄
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{doc.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <a href={`http://localhost:5000/uploads/${doc.document_path}`} target="_blank" rel="noreferrer"
                    className="btn btn-outline" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <ExternalLink size={14} /> View PDF
                  </a>
                  {isAdmin && (
                    <button className="btn" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: 'var(--status-expired-bg)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(doc.id)}>
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
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

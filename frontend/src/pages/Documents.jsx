import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FolderOpen, Upload, Trash2, Download, X, FileText } from 'lucide-react';

const Documents = () => {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async (docId, docName) => {
    try {
      const res = await fetch(`${API}/documents/download/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
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

  const config = { headers: { Authorization: `Bearer ${user.token}` } };

  const fetchData = async () => {
    try {
      const [docsRes, bizsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, config),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, config)
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
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/upload`, uploadData, {
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false); setFile(null); setFormData({ business_id: '', document_name: '', expiration_date: '' }); fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try { await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${id}`, config); fetchData(); }
    catch (err) { setError('Failed to delete'); }
  };

  const getFileIcon = (path) => {
    if (path?.endsWith('.pdf')) return '📄';
    if (path?.match(/\.(jpg|jpeg|png)$/)) return '🖼️';
    return '📎';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--primary-green)', marginBottom: '0.25rem' }}>Documents</h1>
          <p className="text-muted">Upload and manage your permit-related documents.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Upload size={18} /> Upload Document</button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'var(--status-expired-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {loading ? <div className="text-muted text-center" style={{ padding: '4rem' }}>Loading...</div> :
        documents.length === 0 ? (
          <div className="card text-center" style={{ padding: '4rem' }}>
            <FolderOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 className="text-muted">No Documents Yet</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Upload your first permit document.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Upload size={18} /> Upload Document</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {documents.map(doc => (
              <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', background: 'var(--light-green)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    {getFileIcon(doc.file_path)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{doc.business_name}</p>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <p>Uploaded: {new Date(doc.upload_date).toLocaleDateString()}</p>
                  {doc.expiration_date && <p>Expires: {new Date(doc.expiration_date).toLocaleDateString()}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name); }}
                    className="btn btn-outline" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }}>
                    <Download size={14} /> View
                    </button>
                  <button className="btn" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', background: 'var(--status-expired-bg)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Upload Document</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
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
                <label className="form-label">Document Name *</label>
              </div>
              <div className="form-group">
                <input className="form-control" type="date" placeholder=" " value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} />
                <label className="form-label">Expiration Date (optional)</label>
              </div>
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer', background: '#FAFAFA' }}>
                <FileText size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{file ? file.name : 'Click to select a file'}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>PDF, JPG, PNG supported</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer' }} />
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

export default Documents;

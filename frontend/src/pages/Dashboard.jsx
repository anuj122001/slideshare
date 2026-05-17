import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '../services/api';

function openViewer(url, fileType) {
  if (fileType === 'PDF') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const viewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    window.open(viewer, '_blank', 'noopener,noreferrer');
  }
}
import UploadForm from '../components/UploadForm';
import TabFilter from '../components/TabFilter';

const TYPE_BADGE = {
  PDF:   'bg-red-50 text-red-600',
  PPT:   'bg-orange-50 text-orange-600',
  NOTES: 'bg-green-50 text-green-600',
};

export default function Dashboard() {
  const [classes, setClasses]   = useState([]);
  const [docs, setDocs]         = useState([]);
  const [typeFilter, setType]   = useState('');
  const [classFilter, setClass] = useState('');
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api.get('/classes').then(({ data }) => setClasses(data));
  }, []);

  const fetchDocs = useCallback(() => {
    setLoading(true);
    const params = {};
    if (typeFilter)  params.fileType = typeFilter;
    if (classFilter) params.classId  = classFilter;
    api.get('/documents/mine', { params })
      .then(({ data }) => setDocs(data))
      .finally(() => setLoading(false));
  }, [typeFilter, classFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleView(doc) {
    try {
      const { data } = await api.get(`/documents/${doc.id}/download`);
      openViewer(data.downloadUrl, doc.fileType);
    } catch {
      alert('Failed to get view link. Please try again.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/documents/${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Uploader Dashboard</h1>
        <p className="text-gray-500 mt-1">Upload and manage your documents.</p>
      </div>

      {/* Upload Card */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Upload New Document</h2>
        <UploadForm classes={classes} onSuccess={fetchDocs} />
      </div>

      {/* My Docs Table */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800">My Documents</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={classFilter}
              onChange={(e) => setClass(e.target.value)}
              className="input w-auto text-xs py-1.5"
            >
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <TabFilter active={typeFilter} onChange={setType} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No documents yet. Upload one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900 max-w-xs truncate">{doc.title}</td>
                    <td className="py-3 px-3 text-gray-500">{doc.className}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase ${TYPE_BADGE[doc.fileType] || 'bg-gray-100 text-gray-600'}`}>
                        {doc.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(doc)}
                          className="btn-secondary text-xs px-3 py-1.5"
                          title="View document"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                          className="btn-danger"
                        >
                          {deleting === doc.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

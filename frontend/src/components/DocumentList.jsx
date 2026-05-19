import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const TYPE_BADGE = {
  PDF:   'bg-red-50 text-red-600',
  PPT:   'bg-orange-50 text-orange-600',
  NOTES: 'bg-green-50 text-green-600',
};

function openViewer(url, fileType) {
  if (fileType === 'PDF') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const viewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    window.open(viewer, '_blank', 'noopener,noreferrer');
  }
}

export default function DocumentList({ documents, loading }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  async function fetchUrl(docId) {
    try {
      const { data } = await api.get(`/documents/${docId}/download`);
      return data.downloadUrl;
    } catch {
      alert('Failed to get link. Please try again.');
      return null;
    }
  }

  async function handleView(doc) {
    const url = await fetchUrl(doc.id);
    if (url) openViewer(url, doc.fileType);
  }

  async function handleDownload(doc) {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    const url = await fetchUrl(doc.id);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!documents.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No documents found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {documents.map((doc) => (
        <div key={doc.id} className="py-4 px-3 -mx-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex items-start gap-3">
            <span className={`shrink-0 mt-0.5 px-2 py-0.5 text-xs font-semibold rounded uppercase ${TYPE_BADGE[doc.fileType] || 'bg-gray-100 text-gray-600'}`}>
              {doc.fileType}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-snug break-words">{doc.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                by {doc.uploaderName} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}
              </p>
              {/* Action buttons — shown inline on mobile, hidden on sm+ */}
              <div className="flex items-center gap-2 mt-2.5 sm:hidden">
                <button
                  onClick={() => handleView(doc)}
                  className="btn-secondary text-xs px-3 py-1.5 gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="btn-secondary text-xs px-3 py-1.5 gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
            {/* Action buttons — hidden on mobile, shown on sm+ */}
            <div className="shrink-0 hidden sm:flex items-center gap-2">
              <button
                onClick={() => handleView(doc)}
                className="btn-secondary text-xs px-3 py-1.5 gap-1.5"
                title="View document"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>
              <button
                onClick={() => handleDownload(doc)}
                className="btn-secondary text-xs px-3 py-1.5 gap-1.5"
                title="Download document"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

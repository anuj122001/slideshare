import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import TabFilter from '../components/TabFilter';
import DocumentList from '../components/DocumentList';

export default function ClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/classes').then(({ data }) => {
      setCls(data.find((c) => c.id === id) || null);
    });
  }, [id]);

  useEffect(() => {
    setLoading(true);
    const params = { classId: id };
    if (activeTab) params.fileType = activeTab;
    api.get('/documents', { params })
      .then(({ data }) => setDocuments(data))
      .finally(() => setLoading(false));
  }, [id, activeTab]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Classes
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{cls?.name || 'Loading…'}</h1>
        {cls?.description && <p className="mt-1 text-gray-500">{cls.description}</p>}
      </div>

      <div className="card">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <TabFilter active={activeTab} onChange={setActiveTab} />
          <span className="text-sm text-gray-400">{documents.length} documents</span>
        </div>
        <DocumentList documents={documents} loading={loading} />
      </div>
    </div>
  );
}

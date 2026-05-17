import { useEffect, useState } from 'react';
import api from '../services/api';
import ClassCard from '../components/ClassCard';

export default function Home() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/classes').then(({ data }) => setClasses(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse by Class</h1>
        <p className="mt-2 text-gray-500">Select a class to browse PDFs, presentations, and notes.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls, i) => (
            <ClassCard key={cls.id} cls={cls} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

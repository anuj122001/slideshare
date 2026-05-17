import { Link } from 'react-router-dom';

const CLASS_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
];

export default function ClassCard({ cls, index }) {
  const gradient = CLASS_COLORS[index % CLASS_COLORS.length];

  return (
    <Link
      to={`/class/${cls.id}`}
      className="card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 group p-0 overflow-hidden"
    >
      <div className={`bg-gradient-to-r ${gradient} p-5`}>
        <h3 className="text-white font-semibold text-lg">{cls.name}</h3>
      </div>
      <div className="px-5 pb-5 flex flex-col gap-2">
        {cls.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{cls.description}</p>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium pt-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {cls.documentCount} {cls.documentCount === 1 ? 'document' : 'documents'}
        </div>
      </div>
    </Link>
  );
}

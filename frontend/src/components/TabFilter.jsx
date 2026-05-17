const TABS = [
  { label: 'All',   value: '' },
  { label: 'PDF',   value: 'PDF' },
  { label: 'PPT',   value: 'PPT' },
  { label: 'Notes', value: 'NOTES' },
];

export default function TabFilter({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            active === tab.value
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminUsers() {
  const [users, setUsers]     = useState([]);
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    api.get('/admin/users')
      .then(({ data }) => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  async function handlePromote(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    setBusy(true);
    try {
      const { data } = await api.post('/admin/users/promote', { email });
      setMsg(data.message);
      setUsers((prev) =>
        prev.map((u) => u.email === email ? { ...u, role: 'UPLOADER' } : u)
      );
      setEmail('');
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to promote user');
    } finally {
      setBusy(false);
    }
  }

  async function handleDemote(targetEmail) {
    setMsg(''); setErr('');
    try {
      const { data } = await api.post('/admin/users/demote', { email: targetEmail });
      setMsg(data.message);
      setUsers((prev) =>
        prev.map((u) => u.email === targetEmail ? { ...u, role: 'VIEWER' } : u)
      );
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to demote user');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-500 mt-1">Grant or revoke admin (upload) access.</p>
      </div>

      {/* Grant admin */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Grant Admin Access</h2>
        {msg && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">{msg}</div>}
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{err}</div>}
        <form onSubmit={handlePromote} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="input flex-1"
            required
          />
          <button type="submit" disabled={busy} className="btn-primary whitespace-nowrap">
            {busy ? 'Granting…' : 'Grant Admin'}
          </button>
        </form>
      </div>

      {/* User list */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">All Users</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900">{u.name}</td>
                    <td className="py-3 px-3 text-gray-500">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase ${
                        u.role === 'UPLOADER' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'UPLOADER' ? 'Admin' : 'Student'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.role === 'UPLOADER' ? (
                        <button
                          onClick={() => handleDemote(u.email)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Revoke Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => { setEmail(u.email); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          Grant Admin
                        </button>
                      )}
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

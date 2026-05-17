import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [loginAs, setLoginAs] = useState('student');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);

      if (loginAs === 'admin') {
        if (user.role !== 'UPLOADER') {
          setError('You don\'t have admin access. Contact an administrator.');
          setLoading(false);
          return;
        }
        navigate('/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-5">Sign in to your account</p>

          {/* Role toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
            <button
              type="button"
              onClick={() => { setLoginAs('student'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                loginAs === 'student'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setLoginAs('admin'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                loginAs === 'admin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : `Sign In as ${loginAs === 'admin' ? 'Admin' : 'Student'}`}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

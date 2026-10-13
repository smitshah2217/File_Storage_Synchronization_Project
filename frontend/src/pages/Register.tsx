import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Cloud, Lock, User, Mail, ArrowRight, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { authApi } from '../api/authApi';
import { setCredentials } from '../store/authSlice';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const passwordRules = [
    { label: 'At least 8 characters', valid: formData.password.length >= 8 },
    { label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(formData.password) },
    { label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(formData.password) },
    { label: 'At least 1 digit (0-9)', valid: /\d/.test(formData.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = formData.username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setError('Username must be between 3 and 30 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Username can only contain letters, numbers, and underscores (no spaces).');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number.');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({
        username: trimmedUsername,
        email: formData.email.trim(),
        password: formData.password,
      });

      const loginData = await authApi.login({
        usernameOrEmail: trimmedUsername,
        password: formData.password,
      });
      dispatch(setCredentials({ user: loginData.user, token: loginData.token }));
      navigate('/');
    } catch (err: any) {
      if (err.response?.data?.fieldErrors && Array.isArray(err.response.data.fieldErrors) && err.response.data.fieldErrors.length > 0) {
        const errorMsg = err.response.data.fieldErrors
          .map((fe: any) => `${fe.field ? fe.field.charAt(0).toUpperCase() + fe.field.slice(1) + ': ' : ''}${fe.message}`)
          .join(' • ');
        setError(errorMsg);
      } else {
        setError(err.response?.data?.message || 'Failed to register. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#395886] via-[#638ECB] to-[#8AAEE0] p-4 relative overflow-hidden font-sans">
      {/* Decorative cloud glow spheres */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#B1C9EF]/30 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#395886]/40 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F0F3FA]/90 backdrop-blur-xl border border-white/80 mb-4 shadow-xl shadow-[#395886]/20">
            <Cloud className="w-9 h-9 text-[#638ECB]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F0F3FA] drop-shadow-sm">
            Create Account
          </h1>
          <p className="text-[#D5DEEF] text-sm mt-1">Join Cloud Sync Storage today</p>
        </div>

        <div className="bg-[#F0F3FA]/95 backdrop-blur-2xl rounded-3xl p-8 border border-white/60 shadow-2xl shadow-[#395886]/30">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#395886] uppercase tracking-wider ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#8AAEE0]" />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5DEEF] rounded-xl focus:ring-2 focus:ring-[#8AAEE0]/40 focus:border-[#638ECB] text-[#395886] placeholder-[#B1C9EF] text-sm transition-all outline-none"
                  placeholder="e.g. adesh24"
                />
              </div>
              <p className="text-[11px] text-[#638ECB] ml-1">3-30 chars (letters, numbers, underscore)</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#395886] uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#8AAEE0]" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5DEEF] rounded-xl focus:ring-2 focus:ring-[#8AAEE0]/40 focus:border-[#638ECB] text-[#395886] placeholder-[#B1C9EF] text-sm transition-all outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#395886] uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#8AAEE0]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#D5DEEF] rounded-xl focus:ring-2 focus:ring-[#8AAEE0]/40 focus:border-[#638ECB] text-[#395886] placeholder-[#B1C9EF] text-sm transition-all outline-none"
                  placeholder="Enter strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8AAEE0] hover:text-[#395886] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Requirements Checklist */}
              {formData.password && (
                <div className="p-3 bg-[#D5DEEF]/40 border border-[#B1C9EF] rounded-xl mt-2 space-y-1 text-xs">
                  <p className="text-[#395886] font-semibold mb-1">Password Requirements:</p>
                  {passwordRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {rule.valid ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-500/70 shrink-0" />
                      )}
                      <span className={rule.valid ? 'text-emerald-700 font-medium' : 'text-[#638ECB]'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#638ECB] to-[#395886] hover:from-[#395886] hover:to-[#2d466b] text-white rounded-xl font-semibold shadow-lg shadow-[#638ECB]/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs font-medium text-[#638ECB]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#395886] font-bold hover:underline transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

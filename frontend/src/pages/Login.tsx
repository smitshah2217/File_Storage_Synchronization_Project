import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Cloud, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/authApi';
import { setCredentials } from '../store/authSlice';

const Login = () => {
  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login({
        usernameOrEmail: formData.usernameOrEmail.trim(),
        password: formData.password,
      });
      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate('/');
    } catch (err: any) {
      if (err.response?.data?.fieldErrors && Array.isArray(err.response.data.fieldErrors) && err.response.data.fieldErrors.length > 0) {
        const errorMsg = err.response.data.fieldErrors
          .map((fe: any) => `${fe.field ? fe.field.charAt(0).toUpperCase() + fe.field.slice(1) + ': ' : ''}${fe.message}`)
          .join(' • ');
        setError(errorMsg);
      } else {
        setError(err.response?.data?.message || 'Invalid username or password.');
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
            Welcome Back
          </h1>
          <p className="text-[#D5DEEF] text-sm mt-1">Sign in to your cloud storage</p>
        </div>

        <div className="bg-[#F0F3FA]/95 backdrop-blur-2xl rounded-3xl p-8 border border-white/60 shadow-2xl shadow-[#395886]/30">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#395886] uppercase tracking-wider ml-1">Username or Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#8AAEE0]" />
                </div>
                <input
                  type="text"
                  name="usernameOrEmail"
                  required
                  value={formData.usernameOrEmail}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5DEEF] rounded-xl focus:ring-2 focus:ring-[#8AAEE0]/40 focus:border-[#638ECB] text-[#395886] placeholder-[#B1C9EF] text-sm transition-all outline-none"
                  placeholder="e.g. adesh or name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold text-[#395886] uppercase tracking-wider">Password</label>
              </div>
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
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8AAEE0] hover:text-[#395886] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                  Sign In
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs font-medium text-[#638ECB]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#395886] font-bold hover:underline transition-colors">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

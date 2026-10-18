import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, LogOut, UserRound } from 'lucide-react';
import type { RootState } from '../../store/store';
import { logout } from '../../store/authSlice';
import { setSearchQuery } from '../../store/storageSlice';
import { authApi } from '../../api/authApi';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setSearchQuery(searchInput));
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`);
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Stateless logout still succeeds locally if the API cannot be reached.
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  return (
    <header className="h-20 bg-[#F0F3FA]/90 backdrop-blur-xl border-b border-[#D5DEEF] flex items-center justify-between px-8 sticky top-0 z-30 transition-colors">
      <form onSubmit={handleSearch} className="relative w-96 max-w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#8AAEE0]" />
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-[#D5DEEF] rounded-full focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30 focus:border-[#638ECB] text-sm text-[#395886] placeholder-[#8AAEE0] shadow-sm transition-all"
          placeholder="Search files and folders..."
        />
      </form>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-3.5 py-1.5 bg-white/90 rounded-full border border-[#D5DEEF] shadow-sm">
          <button onClick={() => navigate('/profile')} className="flex items-center gap-3 rounded-full text-left" title="Account settings">
            <div className="w-8 h-8 rounded-full bg-[#638ECB] text-[#F0F3FA] flex items-center justify-center font-bold text-sm shadow-inner">
              {user?.username?.[0]?.toUpperCase() || <UserRound className="h-4 w-4" />}
            </div>
            <span className="text-sm font-semibold text-[#395886] hidden sm:block">{user?.username}</span>
          </button>
          <button
            onClick={handleLogout}
            className="ml-1 text-[#8AAEE0] hover:text-red-500 transition-colors p-1 rounded-full hover:bg-[#D5DEEF]/50"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

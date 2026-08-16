import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, LogOut } from 'lucide-react';
import type {  RootState  } from '../../store/store';
import { logout } from '../../store/authSlice';
import { setSearchQuery } from '../../store/storageSlice';
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

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-20 bg-white/50 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-30">
      <form onSubmit={handleSearch} className="relative w-96 max-w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm placeholder-slate-400"
          placeholder="Search in Drive..."
        />
      </form>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-100/50 rounded-full border border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.username}</span>
          <button 
            onClick={handleLogout}
            className="ml-2 text-slate-400 hover:text-red-500 transition-colors p-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HardDrive, Share2, Clock, Trash2, Cloud } from 'lucide-react';
import { userApi } from '../../api/userApi';
import { StorageUsageDto } from '../../types';

const Sidebar = () => {
  const [storage, setStorage] = useState<StorageUsageDto | null>(null);

  useEffect(() => {
    userApi.getStorageUsage().then(setStorage).catch(console.error);
  }, []);

  const getPercentage = () => {
    if (!storage) return 0;
    return Math.min(100, (storage.storageUsedBytes / storage.storageLimitBytes) * 100);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const navItems = [
    { name: 'My Files', path: '/', icon: <HardDrive className="w-5 h-5" /> },
    { name: 'Shared with me', path: '/shared', icon: <Share2 className="w-5 h-5" /> },
    { name: 'Recent', path: '/recent', icon: <Clock className="w-5 h-5" /> },
    { name: 'Trash', path: '/trash', icon: <Trash2 className="w-5 h-5" /> },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3 text-white font-bold text-xl tracking-tight">
        <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
          <Cloud className="w-6 h-6" />
        </div>
        Antigravity
      </div>
      
      <div className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 font-medium'
                  : 'hover:bg-slate-800/50 hover:text-slate-100'
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </div>

      <div className="p-6 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Storage</h3>
        <div className="space-y-3">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
              style={{ width: `${getPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{storage ? formatBytes(storage.storageUsedBytes) : '...'} used</span>
            <span>{storage ? formatBytes(storage.storageLimitBytes) : '...'} total</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

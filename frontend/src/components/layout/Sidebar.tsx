import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HardDrive, Share2, Clock, Trash2, Cloud } from 'lucide-react';
import { userApi } from '../../api/userApi';
import type { StorageUsageDto } from '../../types';

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
    <div className="w-64 h-screen bg-[#395886] border-r border-[#638ECB]/25 text-[#D5DEEF] flex flex-col hidden md:flex shadow-xl shadow-[#395886]/20">
      <div className="p-6 flex items-center gap-3 text-white font-bold text-xl tracking-tight border-b border-white/10">
        <div className="bg-white/15 p-2 rounded-xl text-[#F0F3FA] shadow-inner border border-white/20">
          <Cloud className="w-6 h-6" />
        </div>
        <span className="bg-gradient-to-r from-white to-[#D5DEEF] bg-clip-text text-transparent">
          Cloud Sync
        </span>
      </div>
      
      <div className="flex-1 py-5 px-3 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive
                  ? 'bg-[#F0F3FA] text-[#395886] font-semibold shadow-md shadow-black/10'
                  : 'text-[#D5DEEF] hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </div>

      <div className="p-6 border-t border-white/10 bg-[#2d466b]/40">
        <h3 className="text-xs font-semibold text-[#B1C9EF] uppercase tracking-wider mb-3">Storage</h3>
        <div className="space-y-2.5">
          <div className="h-2 bg-[#2d466b] rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-[#8AAEE0] to-[#F0F3FA] rounded-full transition-all duration-1000 shadow-sm"
              style={{ width: `${getPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#B1C9EF]">
            <span>{storage ? formatBytes(storage.storageUsedBytes) : '...'} used</span>
            <span>{storage ? formatBytes(storage.storageLimitBytes) : '...'} total</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

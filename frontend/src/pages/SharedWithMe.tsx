import {  useEffect, useState, useCallback  } from 'react';
import { Loader2, Globe, Users } from 'lucide-react';
import type { ShareDto } from '../types';
import { shareApi } from '../api/shareApi';

const SharedWithMe = () => {
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShared = useCallback(async () => {
    setLoading(true);
    try {
      const data = await shareApi.getSharedWithMe();
      setShares(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Shared with me</h1>
        <p className="text-slate-500 mt-1">Files shared by others</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-16 h-16 mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">No shared files</p>
          <p className="text-sm mt-1">Files shared with you will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shares.map(share => (
            <div key={share.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500">
                  {share.isPublic ? <Globe className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
              </div>
              <h3 className="font-medium text-slate-800 truncate" title={share.fileName}>{share.fileName}</h3>
              <p className="text-xs text-slate-500 mt-1">Shared by {share.sharedByUsername}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                 <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                   {share.isPublic ? 'Public' : 'Restricted'}
                 </span>
                 <a 
                   href={`/s/${share.id}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-sm font-medium text-blue-600 hover:text-blue-700"
                 >
                   Open Link
                 </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedWithMe;

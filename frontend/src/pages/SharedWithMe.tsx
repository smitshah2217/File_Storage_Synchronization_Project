import { useEffect, useState, useCallback } from 'react';
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
        <h1 className="text-2xl font-bold text-[#395886]">Shared with me</h1>
        <p className="text-[#638ECB] mt-1 text-sm">Files shared by others</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#8AAEE0]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[#8AAEE0] bg-white/60 rounded-2xl border-2 border-dashed border-[#D5DEEF]">
          <Users className="w-16 h-16 mb-4 text-[#8AAEE0]/50" />
          <p className="text-lg font-semibold text-[#395886]">No shared files</p>
          <p className="text-sm mt-1 text-[#638ECB]">Files shared with you will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shares.map(share => (
            <div key={share.id} className="bg-white border border-[#D5DEEF] rounded-2xl p-4 hover:shadow-xl hover:shadow-[#638ECB]/10 hover:border-[#8AAEE0] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#F0F3FA] text-[#638ECB] border border-[#D5DEEF]/60 shadow-sm">
                  {share.isPublic ? <Globe className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
              </div>
              <h3 className="font-semibold text-[#395886] truncate" title={share.fileName}>{share.fileName}</h3>
              <p className="text-xs text-[#8AAEE0] mt-1 font-medium">Shared by {share.sharedByUsername}</p>
              
              <div className="mt-4 pt-3 border-t border-[#D5DEEF]/60 flex items-center justify-between">
                 <span className="text-xs font-semibold bg-[#D5DEEF]/70 text-[#395886] px-2.5 py-0.5 rounded-full">
                   {share.isPublic ? 'Public' : 'Restricted'}
                 </span>
                 <a 
                   href={`/s/${share.id}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-xs font-bold text-[#638ECB] hover:text-[#395886] transition-colors"
                 >
                   Open Link →
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

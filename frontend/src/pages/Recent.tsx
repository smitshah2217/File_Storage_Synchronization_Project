import { useEffect, useState, useCallback } from 'react';
import { Loader2, Clock, Download } from 'lucide-react';
import type { DownloadHistoryDto } from '../types';
import { historyApi } from '../api/historyApi';

const Recent = () => {
  const [history, setHistory] = useState<DownloadHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await historyApi.getDownloadHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#395886] flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#638ECB]" /> Recent Downloads
        </h1>
        <p className="text-[#638ECB] mt-1 text-sm">Your download activity history</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#8AAEE0]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[#8AAEE0] bg-white/60 rounded-2xl border-2 border-dashed border-[#D5DEEF]">
          <Download className="w-16 h-16 mb-4 text-[#8AAEE0]/50" />
          <p className="text-lg font-semibold text-[#395886]">No recent downloads</p>
          <p className="text-sm mt-1 text-[#638ECB]">Files you download will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#D5DEEF] rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F0F3FA] border-b border-[#D5DEEF] text-xs font-bold uppercase tracking-wider text-[#395886]">
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4">Downloaded At</th>
                <th className="px-6 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5DEEF]/60">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-[#F0F3FA]/60 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-[#395886]">{item.fileName}</span>
                  </td>
                  <td className="px-6 py-4 text-[#638ECB] text-sm">
                    {new Date(item.downloadedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-[#8AAEE0] text-sm font-mono">
                    {item.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Recent;

import {  useEffect, useState, useCallback  } from 'react';
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
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-500" /> Recent Downloads
        </h1>
        <p className="text-slate-500 mt-1">Your download activity history</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Download className="w-16 h-16 mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">No recent downloads</p>
          <p className="text-sm mt-1">Files you download will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4">Downloaded At</th>
                <th className="px-6 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800">{item.fileName}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {new Date(item.downloadedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm font-mono">
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

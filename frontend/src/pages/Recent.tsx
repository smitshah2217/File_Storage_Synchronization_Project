import { useCallback, useEffect, useState } from 'react';
import { Loader2, Clock, Download, Trash2, AlertCircle } from 'lucide-react';
import type { PageResponse, DownloadHistoryDto } from '../types';
import { historyApi } from '../api/historyApi';

const Recent = () => {
  const [result, setResult] = useState<PageResponse<DownloadHistoryDto> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async (requestedPage = page) => {
    setLoading(true);
    setError('');
    try {
      setResult(await historyApi.getDownloadHistory(requestedPage));
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not load download history.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void fetchHistory(page); }, [fetchHistory, page]);

  const clearHistory = async () => {
    if (!window.confirm('Clear your download history? This does not delete any stored files.')) return;
    setClearing(true);
    setError('');
    try {
      await historyApi.clearDownloadHistory();
      setPage(0);
      await fetchHistory(0);
    } catch (clearError) {
      setError((clearError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not clear download history.');
    } finally {
      setClearing(false);
    }
  };

  const items = result?.content ?? [];

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#395886]"><Clock className="h-6 w-6 text-[#638ECB]" />Recent Downloads</h1>
          <p className="mt-1 text-sm text-[#638ECB]">Your download activity history</p>
        </div>
        {result && result.totalElements > 0 && <button onClick={() => void clearHistory()} disabled={clearing} className="flex items-center gap-2 self-start rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"><Trash2 className="h-4 w-4" />{clearing ? 'Clearing…' : 'Clear history'}</button>}
      </div>

      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <div className="flex h-64 items-center justify-center text-[#8AAEE0]"><Loader2 className="h-8 w-8 animate-spin" /></div> : items.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D5DEEF] bg-white/60 text-[#8AAEE0]"><Download className="mb-4 h-16 w-16 text-[#8AAEE0]/50" /><p className="text-lg font-semibold text-[#395886]">No recent downloads</p><p className="mt-1 text-sm text-[#638ECB]">Files you download will appear here.</p></div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[#D5DEEF] bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-[#D5DEEF] bg-[#F0F3FA] text-xs font-bold uppercase tracking-wider text-[#395886]"><th className="px-6 py-4">File Name</th><th className="px-6 py-4">Downloaded At</th></tr></thead>
              <tbody className="divide-y divide-[#D5DEEF]/60">
                {items.map((item) => <tr key={item.id} className="transition-colors hover:bg-[#F0F3FA]/60"><td className="px-6 py-4"><span className="font-semibold text-[#395886]">{item.fileNameSnapshot}</span></td><td className="px-6 py-4 text-sm text-[#638ECB]">{new Date(item.downloadedAt).toLocaleString()}</td></tr>)}
              </tbody>
            </table>
          </div>
          {result && result.totalPages > 1 && <div className="mt-4 flex items-center justify-between"><span className="text-sm text-[#638ECB]">Page {result.page + 1} of {result.totalPages}</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#D5DEEF] bg-white px-3 py-2 text-sm text-[#395886] disabled:opacity-50">Previous</button><button disabled={page + 1 >= result.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#D5DEEF] bg-white px-3 py-2 text-sm text-[#395886] disabled:opacity-50">Next</button></div></div>}
        </>
      )}
    </div>
  );
};

export default Recent;

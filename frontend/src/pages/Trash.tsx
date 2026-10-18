import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Loader2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import type { TrashContentsDto } from '../types';
import { trashApi } from '../api/trashApi';
import { folderApi } from '../api/folderApi';
import { fileApi } from '../api/fileApi';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** index).toFixed(2))} ${units[index]}`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const Trash = () => {
  const [contents, setContents] = useState<TrashContentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [emptying, setEmptying] = useState(false);
  const [error, setError] = useState('');

  const fetchTrash = useCallback(async (requestedPage = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const data = await trashApi.getTrashContents(requestedPage);
      setContents((previous) => append && previous ? {
        folders: { ...data.folders, content: [...previous.folders.content, ...data.folders.content] },
        files: { ...data.files, content: [...previous.files.content, ...data.files.content] },
      } : data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load the trash. Try again.'));
      throw requestError;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrash(0, false).catch(() => undefined);
  }, [fetchTrash]);

  const handleRestore = async (type: 'file' | 'folder', id: number) => {
    try {
      if (type === 'folder') await folderApi.restoreFolder(id);
      else await fileApi.restoreFile(id);
      setPage(0);
      await fetchTrash(0, false);
    } catch (restoreError) {
      setError(getErrorMessage(restoreError, 'Restore failed.'));
    }
  };

  const handlePermanentDelete = async (type: 'file' | 'folder', id: number, name: string) => {
    if (!window.confirm(`Permanently delete “${name}”? This cannot be undone.`)) return;
    try {
      if (type === 'folder') await folderApi.permanentDeleteFolder(id);
      else await fileApi.permanentDeleteFile(id);
      setPage(0);
      await fetchTrash(0, false);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Delete failed.'));
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Permanently delete ALL items in trash? This cannot be undone.')) return;
    setEmptying(true);
    setError('');
    try {
      await trashApi.emptyTrash();
      setPage(0);
      await fetchTrash(0, false);
    } catch (emptyError) {
      setError(getErrorMessage(emptyError, 'Could not empty trash.'));
    } finally {
      setEmptying(false);
    }
  };

  const folders = contents?.folders.content ?? [];
  const files = contents?.files.content ?? [];
  const isEmpty = contents && contents.folders.totalElements === 0 && contents.files.totalElements === 0;
  const hasMore = useMemo(() => Boolean(contents && (
    page + 1 < contents.folders.totalPages || page + 1 < contents.files.totalPages
  )), [contents, page]);

  const loadMore = async () => {
    const nextPage = page + 1;
    try {
      await fetchTrash(nextPage, true);
      setPage(nextPage);
    } catch {
      // The inline message is already visible.
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#395886]">Trash</h1>
          <p className="mt-1 text-sm text-[#638ECB]">Items in trash are automatically deleted after 30 days.</p>
        </div>
        {!isEmpty && contents && contents.folders.totalElements + contents.files.totalElements > 0 && (
          <button onClick={() => void handleEmptyTrash()} disabled={emptying}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100 disabled:opacity-60">
            {emptying ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Empty Trash
          </button>
        )}
      </div>

      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading && <div className="flex h-64 items-center justify-center text-[#8AAEE0]"><Loader2 className="h-8 w-8 animate-spin" /></div>}
      {!loading && isEmpty && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D5DEEF] bg-white/60 text-[#8AAEE0]">
          <Trash2 className="mb-4 h-16 w-16 text-[#8AAEE0]/50" />
          <p className="text-lg font-semibold text-[#395886]">Trash is empty</p>
          <p className="mt-1 text-sm text-[#638ECB]">Deleted items will appear here.</p>
        </div>
      )}

      {!loading && contents && !isEmpty && (
        <div className="space-y-3">
          {folders.map((folder) => (
            <div key={`folder-${folder.id}`} className="group flex items-center justify-between rounded-2xl border border-[#D5DEEF] bg-white px-5 py-4 transition-all hover:border-[#8AAEE0] hover:shadow-md">
              <div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D5DEEF]/60 bg-[#F0F3FA] text-[#638ECB]"><Trash2 className="h-5 w-5" /></div><div><p className="font-semibold text-[#395886]">{folder.name}</p><p className="text-xs text-[#8AAEE0]">Folder</p></div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => void handleRestore('folder', folder.id)} className="rounded-lg p-2 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]" title="Restore"><RotateCcw className="h-4 w-4" /></button>
                <button onClick={() => void handlePermanentDelete('folder', folder.id, folder.name)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete permanently"><XCircle className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {files.map((file) => (
            <div key={`file-${file.id}`} className="group flex items-center justify-between rounded-2xl border border-[#D5DEEF] bg-white px-5 py-4 transition-all hover:border-[#8AAEE0] hover:shadow-md">
              <div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D5DEEF]/60 bg-[#F0F3FA] text-[#638ECB]"><Trash2 className="h-5 w-5" /></div><div><p className="font-semibold text-[#395886]">{file.name}</p><p className="text-xs text-[#8AAEE0]">{formatBytes(file.sizeBytes)}</p></div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => void handleRestore('file', file.id)} className="rounded-lg p-2 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]" title="Restore"><RotateCcw className="h-4 w-4" /></button>
                <button onClick={() => void handlePermanentDelete('file', file.id, file.name)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete permanently"><XCircle className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center py-3"><button onClick={() => void loadMore()} disabled={loadingMore} className="flex items-center gap-2 rounded-xl border border-[#D5DEEF] bg-white px-5 py-2.5 text-sm font-semibold text-[#395886] shadow-sm hover:border-[#8AAEE0] disabled:opacity-60">{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}Load more</button></div>
          )}
        </div>
      )}
    </div>
  );
};

export default Trash;

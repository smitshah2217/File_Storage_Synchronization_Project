import React, { useEffect, useState, useCallback, Fragment } from 'react';
import { X, Loader2, ChevronRight, Folder as FolderIcon, Home, ChevronDown, AlertCircle } from 'lucide-react';
import type { FolderDto } from '../../types';
import { folderApi } from '../../api/folderApi';

interface MovePickerModalProps {
  itemName: string;
  currentFolderId: number | null;
  onMove: (destinationFolderId: number | null) => Promise<void>;
  onClose: () => void;
}

const MovePickerModal: React.FC<MovePickerModalProps> = ({ itemName, currentFolderId, onMove, onClose }) => {
  const [navigatingFolderId, setNavigatingFolderId] = useState<number | null>(null);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderDto[]>([]);
  const [folderPage, setFolderPage] = useState(0);
  const [folderTotalPages, setFolderTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState('');

  const fetchContents = useCallback(async (folderId: number | null, page: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const data = folderId
        ? await folderApi.getFolderContents(folderId, page, 100)
        : await folderApi.getRootContents(page, 100);
      setFolders((previous) => append ? [...previous, ...data.subfolders.content] : data.subfolders.content);
      setFolderPage(page);
      setFolderTotalPages(data.subfolders.totalPages);
      if (folderId && !append) setBreadcrumbs(await folderApi.getBreadcrumb(folderId));
      else if (!folderId) setBreadcrumbs([]);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not load destination folders.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void fetchContents(navigatingFolderId, 0);
  }, [fetchContents, navigatingFolderId]);

  const handleMove = async () => {
    setMoving(true);
    setError('');
    try {
      await onMove(navigatingFolderId);
      onClose();
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Move failed.');
      setMoving(false);
    }
  };

  const loadMore = async () => {
    try { await fetchContents(navigatingFolderId, folderPage + 1, true); }
    catch { /* Inline error is visible. */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-[#D5DEEF] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex shrink-0 items-center justify-between"><h2 className="text-lg font-bold text-[#395886]">Move “{itemName}”</h2><button onClick={onClose} className="rounded-lg p-1 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]" aria-label="Close"><X className="h-5 w-5" /></button></div>
        {error && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        <div className="mb-4 flex shrink-0 items-center space-x-1 overflow-x-auto px-2 text-xs font-semibold text-[#638ECB]"><button onClick={() => setNavigatingFolderId(null)} className="rounded p-1 hover:text-[#395886]" title="Root"><Home className="h-3.5 w-3.5" /></button>{breadcrumbs.map((folder, index) => <Fragment key={folder.id}><ChevronRight className="h-3 w-3 text-[#8AAEE0]" /><button onClick={() => setNavigatingFolderId(folder.id)} className={`rounded px-1 py-0.5 hover:text-[#395886] ${index === breadcrumbs.length - 1 ? 'font-bold text-[#395886]' : ''}`}>{folder.name}</button></Fragment>)}</div>
        <div className="min-h-[200px] flex-1 overflow-y-auto rounded-xl border border-[#D5DEEF] bg-[#F0F3FA] p-2">
          {loading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#8AAEE0]" /></div> : folders.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-[#8AAEE0]">No subfolders here</div> : <div className="space-y-1">{folders.map((folder) => <button key={folder.id} onClick={() => setNavigatingFolderId(folder.id)} className="group flex w-full items-center gap-3 rounded-lg border border-transparent p-2.5 text-left transition-all hover:border-[#D5DEEF] hover:bg-white hover:shadow-sm"><FolderIcon className="h-5 w-5 text-[#638ECB] transition-transform group-hover:scale-110" /><span className="truncate text-sm font-semibold text-[#395886]">{folder.name}</span><ChevronRight className="ml-auto h-4 w-4 text-[#8AAEE0] opacity-0 transition-opacity group-hover:opacity-100" /></button>)}</div>}
        </div>
        {!loading && folderPage + 1 < folderTotalPages && <div className="mt-2 flex justify-center"><button onClick={() => void loadMore()} disabled={loadingMore} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#638ECB] hover:bg-[#F0F3FA] disabled:opacity-50">{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}Load more folders</button></div>}
        <div className="mt-6 flex shrink-0 justify-end gap-3"><button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#638ECB] transition-colors hover:bg-[#F0F3FA] hover:text-[#395886]">Cancel</button><button onClick={() => void handleMove()} disabled={moving || loading || navigatingFolderId === currentFolderId} className="flex items-center gap-2 rounded-xl bg-[#638ECB] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#638ECB]/25 transition-all hover:bg-[#395886] disabled:opacity-50">{moving && <Loader2 className="h-4 w-4 animate-spin" />}Move Here</button></div>
      </div>
    </div>
  );
};

export default MovePickerModal;

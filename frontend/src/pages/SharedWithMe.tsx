import { useCallback, useEffect, useState } from 'react';
import { Loader2, Users, Download, Eye, Edit2, FolderOutput, XCircle, AlertCircle } from 'lucide-react';
import type { FileDto, PageResponse, ShareDto } from '../types';
import { shareApi } from '../api/shareApi';
import { fileApi } from '../api/fileApi';
import PreviewModal from '../components/files/PreviewModal';
import RenameModal from '../components/files/RenameModal';

type ShareView = 'with-me' | 'by-me';
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const SharedWithMe = () => {
  const [view, setView] = useState<ShareView>('with-me');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResponse<ShareDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewFile, setPreviewFile] = useState<FileDto | null>(null);
  const [renameFile, setRenameFile] = useState<FileDto | null>(null);

  const fetchShares = useCallback(async (requestedPage = page, requestedView = view) => {
    setLoading(true);
    setError('');
    try {
      const data = requestedView === 'with-me'
        ? await shareApi.getSharedWithMe(requestedPage)
        : await shareApi.getSharedByMe(requestedPage);
      setResult(data);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not load shared files.'));
    } finally { setLoading(false); }
  }, [page, view]);

  useEffect(() => { void fetchShares(page, view); }, [fetchShares, page, view]);

  const switchView = (next: ShareView) => {
    if (next === view) return;
    setPage(0);
    setView(next);
  };

  const openFile = async (share: ShareDto) => {
    try {
      const file = await fileApi.getFile(share.fileId);
      if (file.mimeType?.startsWith('image/') || file.mimeType === 'application/pdf') setPreviewFile(file);
      else await fileApi.downloadFile(file.id, file.name);
    } catch (openError) { setError(errorMessage(openError, 'Unable to open the shared file.')); }
  };

  const downloadFile = async (share: ShareDto) => {
    try { await fileApi.downloadFile(share.fileId, share.fileName); }
    catch (downloadError) { setError(errorMessage(downloadError, 'Download failed.')); }
  };

  const changePermission = async (share: ShareDto, permission: 'VIEW' | 'EDIT') => {
    try { await shareApi.updateShare(share.fileId, share.id, permission); await fetchShares(page, view); }
    catch (requestError) { setError(errorMessage(requestError, 'Could not update permission.')); }
  };

  const revoke = async (share: ShareDto) => {
    if (!window.confirm(`Remove access to “${share.fileName}” for ${share.sharedWithUsername}?`)) return;
    try { await shareApi.revokeShare(share.fileId, share.id); await fetchShares(page, view); }
    catch (requestError) { setError(errorMessage(requestError, 'Could not revoke access.')); }
  };

  const moveSharedFileToRoot = async (share: ShareDto) => {
    try { await fileApi.updateFile(share.fileId, { moveToRoot: true }); await fetchShares(page, view); }
    catch (requestError) { setError(errorMessage(requestError, 'Could not move this file.')); }
  };

  const items = result?.content ?? [];
  const noItems = result?.totalElements === 0;

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#395886]">Sharing</h1>
        <p className="mt-1 text-sm text-[#638ECB]">Manage files shared with you and files you shared with others.</p>
      </div>
      <div className="mb-6 flex gap-2 rounded-xl bg-[#D5DEEF]/50 p-1 sm:w-fit">
        <button onClick={() => switchView('with-me')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${view === 'with-me' ? 'bg-white text-[#395886] shadow-sm' : 'text-[#638ECB] hover:text-[#395886]'}`}>Shared with me</button>
        <button onClick={() => switchView('by-me')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${view === 'by-me' ? 'bg-white text-[#395886] shadow-sm' : 'text-[#638ECB] hover:text-[#395886]'}`}>Shared by me</button>
      </div>
      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <div className="flex h-64 items-center justify-center text-[#8AAEE0]"><Loader2 className="h-8 w-8 animate-spin" /></div> : noItems ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D5DEEF] bg-white/60 text-[#8AAEE0]"><Users className="mb-4 h-16 w-16 text-[#8AAEE0]/50" /><p className="text-lg font-semibold text-[#395886]">{view === 'with-me' ? 'No files have been shared with you' : 'You have not shared any files yet'}</p><p className="mt-1 text-sm text-[#638ECB]">Only direct user-to-user file sharing is supported.</p></div>
      ) : (
        <div className="space-y-3">
          {items.map((share) => (
            <article key={share.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[#D5DEEF] bg-white p-4 transition-all hover:border-[#8AAEE0] hover:shadow-md sm:flex-row sm:items-center sm:p-5">
              <div className="flex min-w-0 items-center gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D5DEEF]/60 bg-[#F0F3FA] text-[#638ECB]"><Users className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate font-semibold text-[#395886]" title={share.fileName}>{share.fileName}</h2><p className="mt-1 text-xs text-[#8AAEE0]">{view === 'with-me' ? `Shared by ${share.ownerUsername}` : `Shared with ${share.sharedWithUsername}`} · {new Date(share.createdAt).toLocaleDateString()}</p></div></div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full bg-[#D5DEEF]/70 px-3 py-1 text-xs font-semibold text-[#395886]">{share.permission}</span>
                {view === 'with-me' ? (
                  <>
                    <button onClick={() => void openFile(share)} className="flex items-center gap-1.5 rounded-lg border border-[#D5DEEF] px-3 py-2 text-xs font-semibold text-[#395886] hover:bg-[#F0F3FA]"><Eye className="h-4 w-4" />Open</button>
                    <button onClick={() => void downloadFile(share)} className="flex items-center gap-1.5 rounded-lg border border-[#D5DEEF] px-3 py-2 text-xs font-semibold text-[#395886] hover:bg-[#F0F3FA]"><Download className="h-4 w-4" />Download</button>
                    {share.permission === 'EDIT' && <>
                      <button onClick={() => void fileApi.getFile(share.fileId).then(setRenameFile).catch((e) => setError(errorMessage(e, 'Could not open file details.')))} className="rounded-lg p-2 text-[#638ECB] hover:bg-[#F0F3FA]" title="Rename"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => void moveSharedFileToRoot(share)} className="rounded-lg p-2 text-[#638ECB] hover:bg-[#F0F3FA]" title="Move to root"><FolderOutput className="h-4 w-4" /></button>
                    </>}
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2 rounded-lg border border-[#D5DEEF] px-2 py-1.5 text-xs text-[#395886]">Permission<select value={share.permission} onChange={(event) => void changePermission(share, event.target.value as 'VIEW' | 'EDIT')} className="rounded border-0 bg-transparent text-xs font-semibold focus:ring-0"><option value="VIEW">View</option><option value="EDIT">Edit</option></select></label>
                    <button onClick={() => void revoke(share)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Revoke access"><XCircle className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </article>
          ))}
          {result && result.totalPages > 1 && <div className="flex items-center justify-between pt-3"><span className="text-sm text-[#638ECB]">Page {result.page + 1} of {result.totalPages}</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-[#D5DEEF] bg-white px-3 py-2 text-sm text-[#395886] disabled:opacity-50">Previous</button><button disabled={page + 1 >= result.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-[#D5DEEF] bg-white px-3 py-2 text-sm text-[#395886] disabled:opacity-50">Next</button></div></div>}
        </div>
      )}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {renameFile && <RenameModal title="Rename shared file" currentName={renameFile.name} onSubmit={async (name) => { await fileApi.updateFile(renameFile.id, { name }); setRenameFile(null); await fetchShares(page, view); }} onClose={() => setRenameFile(null)} />}
    </div>
  );
};

export default SharedWithMe;

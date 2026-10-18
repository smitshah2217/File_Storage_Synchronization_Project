import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Users, AlertCircle, UserPlus, XCircle } from 'lucide-react';
import type { FileDto, ShareDto } from '../../types';
import { shareApi } from '../../api/shareApi';

interface ShareModalProps {
  file: FileDto;
  onClose: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [username, setUsername] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await shareApi.getFileShares(file.id);
      setShares(data.content);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not load sharing settings.'));
    } finally { setLoading(false); }
  }, [file.id]);

  useEffect(() => { void fetchShares(); }, [fetchShares]);

  const handleCreateShare = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await shareApi.createShare(file.id, { sharedWithUsername: username.trim(), permission });
      setUsername('');
      setPermission('VIEW');
      await fetchShares();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not share this file.'));
    } finally { setSaving(false); }
  };

  const updatePermission = async (share: ShareDto, nextPermission: 'VIEW' | 'EDIT') => {
    setError('');
    try {
      await shareApi.updateShare(file.id, share.id, nextPermission);
      await fetchShares();
    } catch (requestError) { setError(getErrorMessage(requestError, 'Could not update permission.')); }
  };

  const revokeShare = async (share: ShareDto) => {
    if (!window.confirm(`Remove ${share.sharedWithUsername}’s access to “${file.name}”?`)) return;
    setError('');
    try {
      await shareApi.revokeShare(file.id, share.id);
      await fetchShares();
    } catch (requestError) { setError(getErrorMessage(requestError, 'Could not revoke access.')); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[#D5DEEF] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#395886]"><Users className="h-5 w-5 text-[#638ECB]" />Share “{file.name}”</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        <form onSubmit={(event) => void handleCreateShare(event)} className="mb-6 rounded-xl border border-[#D5DEEF] bg-[#F0F3FA] p-4">
          <label htmlFor="share-username" className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#395886]">Share with a user</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="share-username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" placeholder="Username" className="min-w-0 flex-1 rounded-lg border border-[#D5DEEF] bg-white px-3 py-2 text-sm text-[#395886] focus:border-[#638ECB] focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30" />
            <select value={permission} onChange={(event) => setPermission(event.target.value as 'VIEW' | 'EDIT')} className="rounded-lg border border-[#D5DEEF] bg-white px-3 py-2 text-sm text-[#395886]"><option value="VIEW">Can view</option><option value="EDIT">Can edit name/move</option></select>
            <button type="submit" disabled={saving || !username.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-[#638ECB] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#395886] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Share</button>
          </div>
          <p className="mt-2 text-xs text-[#638ECB]">The recipient needs an account. Folder sharing and public links are not part of this project.</p>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8AAEE0]">People with access</h3>
          {loading ? <div className="flex justify-center py-8 text-[#8AAEE0]"><Loader2 className="h-6 w-6 animate-spin" /></div> : shares.length === 0 ? <p className="rounded-xl border border-dashed border-[#D5DEEF] bg-[#F0F3FA] py-8 text-center text-sm text-[#8AAEE0]">This file is not shared yet.</p> : (
            <div className="space-y-2">
              {shares.map((share) => <div key={share.id} className="flex flex-col justify-between gap-3 rounded-xl border border-[#D5DEEF] p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F3FA] text-[#638ECB]"><Users className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#395886]">{share.sharedWithUsername}</p><p className="text-xs text-[#8AAEE0]">Added {new Date(share.createdAt).toLocaleDateString()}</p></div></div><div className="flex items-center gap-2"><select aria-label={`Permission for ${share.sharedWithUsername}`} value={share.permission} onChange={(event) => void updatePermission(share, event.target.value as 'VIEW' | 'EDIT')} className="rounded-lg border border-[#D5DEEF] bg-white px-2 py-1.5 text-xs text-[#395886]"><option value="VIEW">View</option><option value="EDIT">Edit</option></select><button onClick={() => void revokeShare(share)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Revoke access"><XCircle className="h-4 w-4" /></button></div></div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

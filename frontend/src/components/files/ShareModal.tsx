import React, { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Link as LinkIcon, Users, Clock, Globe } from 'lucide-react';
import type { FileDto, ShareDto } from '../../types';
import { shareApi } from '../../api/shareApi';

interface ShareModalProps {
  file: FileDto;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ file, onClose }) => {
  const [shares, setShares] = useState<ShareDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [isPublic, setIsPublic] = useState(true);
  const [sharedWithUsername, setSharedWithUsername] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await shareApi.getFileShares(file.id);
      setShares(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      let expiresAt: string | undefined;
      if (expiresInDays !== 'never') {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expiresInDays));
        expiresAt = date.toISOString();
      }

      await shareApi.createShare(file.id, {
        isPublic,
        sharedWithUsername: isPublic ? undefined : sharedWithUsername,
        expiresAt
      });
      
      // Reset form
      setSharedWithUsername('');
      await fetchShares();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create share link.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareId: number) => {
    try {
      await shareApi.revokeShare(shareId);
      await fetchShares();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (shareId: number) => {
    const url = `${window.location.origin}/s/${shareId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Share "{file.name}"
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Share Form */}
        <form onSubmit={handleCreateShare} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 shrink-0">
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  checked={isPublic} 
                  onChange={() => setIsPublic(true)} 
                  className="w-4 h-4 text-blue-600" 
                />
                <Globe className="w-4 h-4 text-slate-400" /> Anyone with the link
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  checked={!isPublic} 
                  onChange={() => setIsPublic(false)} 
                  className="w-4 h-4 text-blue-600" 
                />
                <Users className="w-4 h-4 text-slate-400" /> Specific User
              </label>
            </div>

            {!isPublic && (
              <input
                type="text"
                value={sharedWithUsername}
                onChange={(e) => setSharedWithUsername(e.target.value)}
                placeholder="Enter username to share with..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                required
              />
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="1">Expires in 1 day</option>
                  <option value="7">Expires in 7 days</option>
                  <option value="30">Expires in 30 days</option>
                  <option value="never">Never expires</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating || (!isPublic && !sharedWithUsername)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                Generate Link
              </button>
            </div>
          </div>
        </form>

        {/* Existing Shares */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Shares</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-slate-100 dashed">
              This file hasn't been shared yet.
            </p>
          ) : (
            <div className="space-y-3">
              {shares.map(share => (
                <div key={share.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                      {share.isPublic ? <Globe className="w-4 h-4 text-blue-500" /> : <Users className="w-4 h-4 text-indigo-500" />}
                      {share.isPublic ? 'Public Link' : `Shared with ${share.sharedWithUsername}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {share.expiresAt ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}` : 'Never expires'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(share.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Copy Link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Revoke Access"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

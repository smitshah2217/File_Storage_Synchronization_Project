import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Download, Upload, Eye, RotateCcw, AlertCircle } from 'lucide-react';
import type { FileDto, FileVersionDto } from '../../types';
import { fileApi } from '../../api/fileApi';

interface VersionHistoryModalProps {
  file: FileDto;
  onClose: () => void;
  onVersionRestored: () => void | Promise<void>;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** index).toFixed(2))} ${units[index]}`;
};

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ file, onClose, onVersionRestored }) => {
  const [versions, setVersions] = useState<FileVersionDto[]>([]);
  const [currentVersion, setCurrentVersion] = useState(file.versionNumber);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [previewVersion, setPreviewVersion] = useState<{ url: string; version: number; mimeType: string } | null>(null);
  const [error, setError] = useState('');

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fileApi.getVersions(file.id);
      setVersions(result.content);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not load versions.');
    } finally { setLoading(false); }
  }, [file.id]);

  useEffect(() => { void fetchVersions(); }, [fetchVersions]);
  useEffect(() => () => { if (previewVersion?.url) window.URL.revokeObjectURL(previewVersion.url); }, [previewVersion?.url]);

  const handleUploadNewVersion = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!selected) return;
    setUploading(true);
    setError('');
    try {
      const updated = await fileApi.uploadNewVersion(file.id, selected);
      setCurrentVersion(updated.versionNumber);
      await fetchVersions();
      await onVersionRestored();
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not upload a new version.');
    } finally { setUploading(false); }
  };

  const handleRestore = async (versionNumber: number) => {
    if (!window.confirm(`Restore version ${versionNumber} as the current version?`)) return;
    setRestoring(versionNumber);
    setError('');
    try {
      const updated = await fileApi.restoreVersion(file.id, versionNumber);
      setCurrentVersion(updated.versionNumber);
      await fetchVersions();
      await onVersionRestored();
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not restore this version.');
    } finally { setRestoring(null); }
  };

  const handleDownload = async (versionNumber: number) => {
    try { await fileApi.downloadVersion(file.id, versionNumber, file.name); }
    catch (requestError) { setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Download failed.'); }
  };

  const handlePreview = async (versionNumber: number) => {
    try {
      const url = await fileApi.getPreviewUrlForVersion(file.id, versionNumber);
      setPreviewVersion((previous) => {
        if (previous?.url) window.URL.revokeObjectURL(previous.url);
        const selectedVersion = versions.find((item) => item.versionNumber === versionNumber);
        return { url, version: versionNumber, mimeType: selectedVersion?.mimeType || file.mimeType };
      });
    } catch {
      setError('Unable to preview this version.');
    }
  };

  const closePreview = () => {
    if (previewVersion?.url) window.URL.revokeObjectURL(previewVersion.url);
    setPreviewVersion(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {previewVersion ? (
        <div className="relative z-20 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#D5DEEF] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#D5DEEF] bg-[#F0F3FA]/70 px-6 py-4"><h2 className="font-bold text-[#395886]">Preview: {file.name} (v{previewVersion.version})</h2><button onClick={closePreview} className="rounded-xl p-2 text-[#8AAEE0] hover:bg-white hover:text-[#395886]"><X className="h-5 w-5" /></button></div>
          <div className="flex min-h-[400px] flex-1 items-center justify-center overflow-auto bg-[#F0F3FA]">{previewVersion.mimeType.startsWith('image/') ? <img src={previewVersion.url} alt={file.name} className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-sm" /> : <iframe src={previewVersion.url} className="h-[75vh] w-full border-0" title={file.name} />}</div>
        </div>
      ) : (
        <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[#D5DEEF] bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold text-[#395886]">Version History</h2><p className="mt-0.5 text-sm text-[#638ECB]">{file.name}</p></div><button onClick={onClose} className="rounded-lg p-1 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]"><X className="h-5 w-5" /></button></div>
          {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          <div className="mb-4 flex justify-end"><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#D5DEEF] bg-[#D5DEEF]/60 px-4 py-2 text-sm font-semibold text-[#395886] shadow-sm hover:bg-[#B1C9EF]/60">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-[#638ECB]" />}Upload New Version<input type="file" className="hidden" onChange={(event) => void handleUploadNewVersion(event)} disabled={uploading} /></label></div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#8AAEE0]" /></div> : versions.length === 0 ? <p className="py-8 text-center text-sm text-[#8AAEE0]">No versions are available.</p> : <div className="space-y-3">{versions.map((version) => (
              <div key={version.id} className="group flex flex-col justify-between gap-3 rounded-2xl border border-[#D5DEEF] bg-white p-4 transition-all hover:border-[#8AAEE0] hover:shadow-md sm:flex-row sm:items-center">
                <div className="flex items-center gap-4"><div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${version.versionNumber === currentVersion ? 'bg-[#638ECB] text-[#F0F3FA]' : 'border border-[#D5DEEF] bg-[#F0F3FA] text-[#8AAEE0]'}`}>v{version.versionNumber}</div><div><p className="text-sm font-semibold text-[#395886]">{new Date(version.uploadedAt).toLocaleString()}{version.versionNumber === currentVersion && <span className="ml-2 rounded-full bg-[#D5DEEF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#395886]">Current</span>}</p><p className="mt-0.5 text-xs font-medium text-[#8AAEE0]">{formatBytes(version.sizeBytes)}{version.uploadedByUsername ? ` · ${version.uploadedByUsername}` : ''}</p></div></div>
                <div className="flex items-center gap-1 self-end sm:self-auto">{(version.mimeType.startsWith('image/') || version.mimeType === 'application/pdf') && <button onClick={() => void handlePreview(version.versionNumber)} className="rounded-lg p-2 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]" title="Preview"><Eye className="h-4 w-4" /></button>}<button onClick={() => void handleDownload(version.versionNumber)} className="rounded-lg p-2 text-[#8AAEE0] hover:bg-[#F0F3FA] hover:text-[#395886]" title="Download"><Download className="h-4 w-4" /></button>{version.versionNumber !== currentVersion && <button onClick={() => void handleRestore(version.versionNumber)} disabled={restoring !== null} className="rounded-lg p-2 text-[#638ECB] hover:bg-[#F0F3FA] hover:text-[#395886] disabled:opacity-50" title="Restore this version">{restoring === version.versionNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}</button>}</div>
              </div>
            ))}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryModal;

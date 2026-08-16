import React, { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Download, Upload, Eye } from 'lucide-react';
import type { FileDto, FileVersionDto } from '../../types';
import { fileApi } from '../../api/fileApi';

interface VersionHistoryModalProps {
  file: FileDto;
  onClose: () => void;
  onVersionRestored: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ file, onClose, onVersionRestored }) => {
  const [versions, setVersions] = useState<FileVersionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<{ url: string, version: number } | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fileApi.getVersions(file.id);
      setVersions(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [file.id]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    try {
      await fileApi.uploadNewVersion(file.id, selectedFile);
      await fetchVersions();
      onVersionRestored(); // Notify parent to refresh file sizes
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload new version.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (version: number) => {
    fileApi.downloadVersion(file.id, version, file.name).catch(console.error);
  };

  const handlePreview = async (version: number) => {
    try {
      const url = await fileApi.getPreviewUrlForVersion(file.id, version);
      setPreviewVersion({ url, version });
    } catch (err: any) {
      alert('Unable to load preview for this version.');
    }
  };

  const closePreview = () => {
    if (previewVersion?.url) window.URL.revokeObjectURL(previewVersion.url);
    setPreviewVersion(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {previewVersion ? (
        // Nested Preview Modal
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden z-20">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Preview: {file.name} (v{previewVersion.version})</h2>
            <button onClick={closePreview} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 min-h-[400px]">
             {file.mimeType.startsWith('image/') ? (
               <img src={previewVersion.url} alt={file.name} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
             ) : (
               <iframe src={previewVersion.url} className="w-full h-[75vh] border-0" title={file.name} />
             )}
          </div>
        </div>
      ) : (
        // Main Version History List
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 z-10 flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Version History</h2>
              <p className="text-sm text-slate-500 mt-1">{file.name}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-end mb-4 shrink-0">
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload New Version
              <input type="file" className="hidden" onChange={handleUploadNewVersion} disabled={uploading} />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-md transition-all group bg-white">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${v.versionNumber === file.versionNumber ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        v{v.versionNumber}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {new Date(v.createdAt).toLocaleString()}
                          {v.versionNumber === file.versionNumber && <span className="ml-2 text-[10px] uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Current</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatBytes(v.sizeBytes)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                        <button onClick={() => handlePreview(v.versionNumber)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDownload(v.versionNumber)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryModal;

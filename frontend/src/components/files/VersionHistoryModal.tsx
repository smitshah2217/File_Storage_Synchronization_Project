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
      onVersionRestored();
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      {previewVersion ? (
        // Nested Preview Modal
        <div className="relative bg-white rounded-2xl shadow-2xl border border-[#D5DEEF] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D5DEEF] bg-[#F0F3FA]/70">
            <h2 className="font-bold text-[#395886]">Preview: {file.name} (v{previewVersion.version})</h2>
            <button onClick={closePreview} className="p-2 text-[#8AAEE0] hover:text-[#395886] hover:bg-white rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-[#F0F3FA] min-h-[400px]">
             {file.mimeType.startsWith('image/') ? (
               <img src={previewVersion.url} alt={file.name} className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm" />
             ) : (
               <iframe src={previewVersion.url} className="w-full h-[75vh] border-0" title={file.name} />
             )}
          </div>
        </div>
      ) : (
        // Main Version History List
        <div className="relative bg-white rounded-2xl shadow-2xl border border-[#D5DEEF] w-full max-w-2xl p-6 z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-[#395886]">Version History</h2>
              <p className="text-sm text-[#638ECB] mt-0.5">{file.name}</p>
            </div>
            <button onClick={onClose} className="p-1 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-end mb-4 shrink-0">
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#395886] bg-[#D5DEEF]/60 hover:bg-[#B1C9EF]/60 border border-[#D5DEEF] rounded-xl transition-all shadow-sm cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-[#638ECB]" />}
              Upload New Version
              <input type="file" className="hidden" onChange={handleUploadNewVersion} disabled={uploading} />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#8AAEE0]" />
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 border border-[#D5DEEF] rounded-2xl hover:border-[#8AAEE0] hover:shadow-md transition-all group bg-white">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${v.versionNumber === file.versionNumber ? 'bg-[#638ECB] text-[#F0F3FA] shadow-sm' : 'bg-[#F0F3FA] text-[#8AAEE0] border border-[#D5DEEF]'}`}>
                        v{v.versionNumber}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#395886]">
                          {new Date(v.createdAt).toLocaleString()}
                          {v.versionNumber === file.versionNumber && <span className="ml-2 text-[10px] uppercase font-bold tracking-wider bg-[#D5DEEF] text-[#395886] px-2 py-0.5 rounded-full">Current</span>}
                        </p>
                        <p className="text-xs text-[#8AAEE0] mt-0.5 font-medium">{formatBytes(v.sizeBytes)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                        <button onClick={() => handlePreview(v.versionNumber)} className="p-2 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDownload(v.versionNumber)} className="p-2 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors" title="Download">
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

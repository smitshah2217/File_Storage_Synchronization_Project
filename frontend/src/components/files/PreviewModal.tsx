import React, { useEffect, useState } from 'react';
import { X, Loader2, Download } from 'lucide-react';
import type {  FileDto  } from '../../types';
import { fileApi } from '../../api/fileApi';

interface PreviewModalProps {
  file: FileDto;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let localUrl: string | null = null;
    setLoading(true);
    setError('');

    fileApi.getPreviewUrl(file.id)
      .then((url) => {
        if (!cancelled) {
          localUrl = url;
          setPreviewUrl(url);
          setLoading(false);
        } else {
          window.URL.revokeObjectURL(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load preview.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (localUrl) window.URL.revokeObjectURL(localUrl);
    };
  }, [file.id]);

  const handleDownload = () => {
    fileApi.downloadFile(file.id, file.name).catch(console.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-800 truncate max-w-md" title={file.name}>
              {file.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Version {file.versionNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 min-h-[400px]">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Loading preview...</span>
            </div>
          )}
          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-6 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
          {!loading && !error && previewUrl && (
            <>
              {file.mimeType.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              ) : file.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[75vh] border-0"
                  title={file.name}
                />
              ) : (
                <p className="text-sm text-slate-500">Preview not available for this file type.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

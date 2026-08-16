import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { FolderDto, FileDto, TrashContentsDto } from '../types';
import { trashApi } from '../api/trashApi';
import { folderApi } from '../api/folderApi';
import { fileApi } from '../api/fileApi';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Trash = () => {
  const [contents, setContents] = useState<TrashContentsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptying, setEmptying] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trashApi.getTrashContents();
      setContents(data);
    } catch (err) {
      console.error('Failed to fetch trash:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (type: 'file' | 'folder', id: number) => {
    try {
      if (type === 'folder') {
        await folderApi.restoreFolder(id);
      } else {
        await fileApi.restoreFile(id);
      }
      await fetchTrash();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Restore failed.');
    }
  };

  const handlePermanentDelete = async (type: 'file' | 'folder', id: number, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      if (type === 'folder') {
        await folderApi.permanentDeleteFolder(id);
      } else {
        await fileApi.permanentDeleteFile(id);
      }
      await fetchTrash();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Permanently delete ALL items in trash? This cannot be undone.')) return;
    setEmptying(true);
    try {
      await trashApi.emptyTrash();
      await fetchTrash();
    } catch (err) {
      console.error('Failed to empty trash:', err);
    } finally {
      setEmptying(false);
    }
  };

  const isEmpty = contents && contents.trashedFolders.length === 0 && contents.trashedFiles.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trash</h1>
          <p className="text-sm text-slate-400 mt-1">Items in trash are automatically deleted after 30 days.</p>
        </div>
        {!isEmpty && (
          <button
            onClick={handleEmptyTrash}
            disabled={emptying}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all disabled:opacity-60"
          >
            {emptying ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Empty Trash
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && isEmpty && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Trash2 className="w-16 h-16 mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">Trash is empty</p>
          <p className="text-sm mt-1">Deleted items will appear here.</p>
        </div>
      )}

      {/* Items */}
      {!loading && contents && !isEmpty && (
        <div className="space-y-2">
          {/* Folders */}
          {contents.trashedFolders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">{folder.name}</p>
                  <p className="text-xs text-slate-400">Folder</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRestore('folder', folder.id)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePermanentDelete('folder', folder.id, folder.name)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete permanently"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Files */}
          {contents.trashedFiles.map((file) => (
            <div
              key={`file-${file.id}`}
              className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.sizeBytes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRestore('file', file.id)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePermanentDelete('file', file.id, file.name)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete permanently"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trash;

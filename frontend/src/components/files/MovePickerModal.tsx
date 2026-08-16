import React, { useEffect, useState, useCallback, Fragment } from 'react';
import { X, Loader2, ChevronRight, Folder as FolderIcon, Home } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  const fetchContents = useCallback(async (folderId: number | null) => {
    setLoading(true);
    try {
      const data = folderId
        ? await folderApi.getFolderContents(folderId)
        : await folderApi.getRootContents();
      
      setFolders(data.subfolders);

      if (folderId) {
        const bc = await folderApi.getBreadcrumb(folderId);
        setBreadcrumbs(bc);
      } else {
        setBreadcrumbs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(navigatingFolderId);
  }, [fetchContents, navigatingFolderId]);

  const handleMove = async () => {
    setMoving(true);
    try {
      await onMove(navigatingFolderId);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Move failed.');
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">Move "{itemName}"</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mini Breadcrumb */}
        <div className="flex items-center space-x-1 text-xs font-medium text-slate-500 mb-4 px-2 shrink-0 overflow-x-auto">
          <button onClick={() => setNavigatingFolderId(null)} className="hover:text-blue-600 p-1">
            <Home className="w-3 h-3" />
          </button>
          {breadcrumbs.map((f, i) => (
            <Fragment key={f.id}>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button 
                onClick={() => setNavigatingFolderId(f.id)}
                className={`hover:text-blue-600 px-1 py-0.5 rounded ${i === breadcrumbs.length - 1 ? 'text-slate-800' : ''}`}
              >
                {f.name}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-slate-400">
              No subfolders here
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setNavigatingFolderId(folder.id)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all text-left group"
                >
                  <FolderIcon className="w-5 h-5 text-blue-400 group-hover:text-blue-500" />
                  <span className="text-sm font-medium text-slate-700 truncate">{folder.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={moving || navigatingFolderId === currentFolderId}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {moving && <Loader2 className="w-4 h-4 animate-spin" />}
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovePickerModal;

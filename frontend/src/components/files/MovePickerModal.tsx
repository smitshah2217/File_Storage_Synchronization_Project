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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#D5DEEF] w-full max-w-md p-6 z-10 flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-lg font-bold text-[#395886]">Move "{itemName}"</h2>
          <button onClick={onClose} className="p-1 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mini Breadcrumb */}
        <div className="flex items-center space-x-1 text-xs font-semibold text-[#638ECB] mb-4 px-2 shrink-0 overflow-x-auto">
          <button onClick={() => setNavigatingFolderId(null)} className="hover:text-[#395886] p-1">
            <Home className="w-3.5 h-3.5" />
          </button>
          {breadcrumbs.map((f, i) => (
            <Fragment key={f.id}>
              <ChevronRight className="w-3 h-3 text-[#8AAEE0]" />
              <button 
                onClick={() => setNavigatingFolderId(f.id)}
                className={`hover:text-[#395886] px-1 py-0.5 rounded ${i === breadcrumbs.length - 1 ? 'text-[#395886] font-bold' : ''}`}
              >
                {f.name}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto border border-[#D5DEEF] rounded-xl bg-[#F0F3FA] p-2 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#8AAEE0]" />
            </div>
          ) : folders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-[#8AAEE0]">
              No subfolders here
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setNavigatingFolderId(folder.id)}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-[#D5DEEF] transition-all text-left group"
                >
                  <FolderIcon className="w-5 h-5 text-[#638ECB] group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-[#395886] truncate">{folder.name}</span>
                  <ChevronRight className="w-4 h-4 text-[#8AAEE0] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#638ECB] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={moving || navigatingFolderId === currentFolderId}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#638ECB] hover:bg-[#395886] rounded-xl transition-all shadow-md shadow-[#638ECB]/25 flex items-center gap-2 disabled:opacity-50"
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

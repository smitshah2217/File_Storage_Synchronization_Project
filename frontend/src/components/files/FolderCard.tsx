import React, { useState } from 'react';
import { Folder as FolderIcon, MoreVertical, Edit2, Trash2, FolderOutput } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FolderDto } from '../../types';

interface FolderCardProps {
  folder: FolderDto;
  onRename: (folder: FolderDto) => void;
  onMove: (folder: FolderDto) => void;
  onDelete: (folder: FolderDto) => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ folder, onRename, onMove, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative bg-white border border-[#D5DEEF] rounded-2xl p-4 hover:shadow-xl hover:shadow-[#638ECB]/10 hover:border-[#8AAEE0] transition-all duration-300">
      <Link to={`/folder/${folder.id}`} className="absolute inset-0 z-0"></Link>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#F0F3FA] text-[#638ECB] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#D5DEEF]/60 shadow-sm">
          <FolderIcon className="w-6 h-6 fill-[#8AAEE0]/30 text-[#638ECB]" />
        </div>
        
        <div className="relative">
          <button 
            onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
            className="p-1.5 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#D5DEEF] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => { setShowMenu(false); onRename(folder); }}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4 text-[#8AAEE0]" /> Rename
                </button>
                <button 
                  onClick={() => { setShowMenu(false); onMove(folder); }}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <FolderOutput className="w-4 h-4 text-[#8AAEE0]" /> Move
                </button>
                <div className="h-px bg-[#D5DEEF] my-1"></div>
                <button 
                  onClick={() => { setShowMenu(false); onDelete(folder); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-red-400" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-4 relative z-10 pointer-events-none">
        <h3 className="font-semibold text-[#395886] truncate">{folder.name}</h3>
        <p className="text-xs text-[#8AAEE0] mt-1 font-medium">
          {new Date(folder.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default FolderCard;

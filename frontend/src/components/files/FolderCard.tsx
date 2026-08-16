import React, { useState } from 'react';
import { Folder as FolderIcon, MoreVertical, Edit2, Trash2, FolderOutput } from 'lucide-react';
import { Link } from 'react-router-dom';
import type {  FolderDto  } from '../../types';

interface FolderCardProps {
  folder: FolderDto;
  onRename: (folder: FolderDto) => void;
  onMove: (folder: FolderDto) => void;
  onDelete: (folder: FolderDto) => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ folder, onRename, onMove, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all duration-300">
      <Link to={`/folder/${folder.id}`} className="absolute inset-0 z-0"></Link>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <FolderIcon className="w-6 h-6 fill-blue-500/20" />
        </div>
        
        <div className="relative">
          <button 
            onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => { setShowMenu(false); onRename(folder); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4 text-slate-400" /> Rename
                </button>
                <button 
                  onClick={() => { setShowMenu(false); onMove(folder); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FolderOutput className="w-4 h-4 text-slate-400" /> Move
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
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
        <h3 className="font-semibold text-slate-800 truncate">{folder.name}</h3>
        <p className="text-xs text-slate-400 mt-1">
          {new Date(folder.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default FolderCard;

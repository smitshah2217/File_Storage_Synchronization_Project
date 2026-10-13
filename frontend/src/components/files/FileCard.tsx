import React, { useState } from 'react';
import { File as FileIcon, FileText, FileImage, FileCode, Archive, MoreVertical, Edit2, Trash2, FolderOutput, Download, Eye, Users, History } from 'lucide-react';
import type { FileDto } from '../../types';
import { fileApi } from '../../api/fileApi';

interface FileCardProps {
  file: FileDto;
  onRename: (file: FileDto) => void;
  onMove: (file: FileDto) => void;
  onDelete: (file: FileDto) => void;
  onPreview: (file: FileDto) => void;
  onShare: (file: FileDto) => void;
  onHistory: (file: FileDto) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FileImage className="w-6 h-6 fill-[#638ECB]/20 text-[#638ECB]" />;
  if (mimeType === 'application/pdf') return <FileText className="w-6 h-6 fill-red-500/20 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return <Archive className="w-6 h-6 fill-amber-500/20 text-amber-500" />;
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html')) return <FileCode className="w-6 h-6 fill-emerald-500/20 text-emerald-600" />;
  return <FileIcon className="w-6 h-6 fill-[#8AAEE0]/20 text-[#395886]" />;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileCard: React.FC<FileCardProps> = ({ file, onRename, onMove, onDelete, onPreview, onShare, onHistory }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleDownload = () => {
    setShowMenu(false);
    fileApi.downloadFile(file.id, file.name).catch(console.error);
  };

  return (
    <div className="group relative bg-white border border-[#D5DEEF] rounded-2xl p-4 hover:shadow-xl hover:shadow-[#638ECB]/10 hover:border-[#8AAEE0] transition-all duration-300 flex flex-col">
      <div 
        className="absolute inset-0 z-0 cursor-pointer"
        onClick={() => file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf' ? onPreview(file) : null}
      ></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#F0F3FA] text-[#638ECB] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#D5DEEF]/60 shadow-sm">
          {getFileIcon(file.mimeType)}
        </div>
        
        <div className="relative">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#D5DEEF] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-200">
                {(file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') && (
                  <button 
                    onClick={() => { setShowMenu(false); onPreview(file); }}
                    className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-[#8AAEE0]" /> Preview
                  </button>
                )}
                <button 
                  onClick={handleDownload}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#8AAEE0]" /> Download
                </button>
                <div className="h-px bg-[#D5DEEF] my-1"></div>
                <button 
                  onClick={() => { setShowMenu(false); onShare(file); }}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-[#8AAEE0]" /> Share
                </button>
                <button 
                  onClick={() => { setShowMenu(false); onHistory(file); }}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <History className="w-4 h-4 text-[#8AAEE0]" /> Version History
                </button>
                <div className="h-px bg-[#D5DEEF] my-1"></div>
                <button 
                  onClick={() => { setShowMenu(false); onRename(file); }}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4 text-[#8AAEE0]" /> Rename
                </button>
                <button 
                  onClick={() => { setShowMenu(false); onMove(file); }}
                  className="w-full px-4 py-2 text-left text-sm text-[#395886] hover:bg-[#F0F3FA] flex items-center gap-2"
                >
                  <FolderOutput className="w-4 h-4 text-[#8AAEE0]" /> Move
                </button>
                <div className="h-px bg-[#D5DEEF] my-1"></div>
                <button 
                  onClick={() => { setShowMenu(false); onDelete(file); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-red-400" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex-1 flex flex-col justify-end relative z-10 pointer-events-none">
        <h3 className="font-semibold text-[#395886] truncate" title={file.name}>{file.name}</h3>
        <div className="flex justify-between items-center mt-1.5">
          <p className="text-xs text-[#8AAEE0] font-medium">{formatBytes(file.sizeBytes)}</p>
          <p className="text-[10px] font-bold text-[#395886] bg-[#D5DEEF]/70 px-2 py-0.5 rounded-full">v{file.versionNumber}</p>
        </div>
      </div>
    </div>
  );
};

export default FileCard;

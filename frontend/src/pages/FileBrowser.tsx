import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, FolderPlus, Loader2, FolderOpen } from 'lucide-react';
import { FolderDto, FileDto, FolderContentDto } from '../types';
import { folderApi } from '../api/folderApi';
import { fileApi } from '../api/fileApi';
import BreadcrumbNav from '../components/files/BreadcrumbNav';
import FolderCard from '../components/files/FolderCard';
import FileCard from '../components/files/FileCard';
import PreviewModal from '../components/files/PreviewModal';
import RenameModal from '../components/files/RenameModal';

const FileBrowser = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const currentFolderId = folderId ? Number(folderId) : null;

  const [contents, setContents] = useState<FolderContentDto | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Modal state
  const [previewFile, setPreviewFile] = useState<FileDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; item: FileDto | FolderDto } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const data = currentFolderId
        ? await folderApi.getFolderContents(currentFolderId)
        : await folderApi.getRootContents();
      setContents(data);

      if (currentFolderId) {
        const bc = await folderApi.getBreadcrumb(currentFolderId);
        setBreadcrumbs(bc);
      } else {
        setBreadcrumbs([]);
      }
    } catch (err) {
      console.error('Failed to fetch contents:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // --- Upload ---
  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList);
      if (files.length === 1) {
        await fileApi.uploadFile(files[0], currentFolderId);
      } else {
        await fileApi.uploadBatch(files, currentFolderId);
      }
      await fetchContents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // --- Drag & Drop ---
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // --- Folder Actions ---
  const handleCreateFolder = async (name: string) => {
    await folderApi.createFolder(name, currentFolderId);
    await fetchContents();
  };

  const handleRenameFolder = async (folder: FolderDto, newName: string) => {
    await folderApi.updateFolder(folder.id, { name: newName });
    await fetchContents();
  };

  const handleDeleteFolder = async (folder: FolderDto) => {
    if (!window.confirm(`Move "${folder.name}" to Trash?`)) return;
    await folderApi.deleteFolder(folder.id);
    await fetchContents();
  };

  // --- File Actions ---
  const handleRenameFile = async (file: FileDto, newName: string) => {
    await fileApi.updateFile(file.id, { name: newName });
    await fetchContents();
  };

  const handleDeleteFile = async (file: FileDto) => {
    if (!window.confirm(`Move "${file.name}" to Trash?`)) return;
    await fileApi.deleteFile(file.id);
    await fetchContents();
  };

  const isEmpty = contents && contents.subfolders.length === 0 && contents.files.length === 0;

  return (
    <div
      className={`h-full transition-colors duration-200 rounded-2xl ${dragOver ? 'ring-2 ring-blue-400 ring-offset-4 bg-blue-50/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <BreadcrumbNav breadcrumbs={breadcrumbs} />
          <h1 className="text-2xl font-bold text-slate-800">
            {currentFolderId ? contents?.folder?.name || 'Folder' : 'My Files'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-sm cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <FolderOpen className="w-16 h-16 mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">This folder is empty</p>
          <p className="text-sm mt-1">Drop files here or click Upload to get started.</p>
        </div>
      )}

      {/* Content grid */}
      {!loading && contents && !isEmpty && (
        <div className="space-y-8">
          {/* Folders */}
          {contents.subfolders.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Folders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {contents.subfolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onRename={(f) => setRenameTarget({ type: 'folder', item: f })}
                    onMove={() => alert('Move feature coming in Phase 17')}
                    onDelete={handleDeleteFolder}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {contents.files.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Files</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {contents.files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onRename={(f) => setRenameTarget({ type: 'file', item: f })}
                    onMove={() => alert('Move feature coming in Phase 17')}
                    onDelete={handleDeleteFile}
                    onPreview={(f) => setPreviewFile(f)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px] pointer-events-none">
          <div className="bg-white shadow-2xl rounded-2xl px-12 py-10 flex flex-col items-center gap-3 border-2 border-dashed border-blue-400">
            <Upload className="w-12 h-12 text-blue-500" />
            <p className="text-lg font-semibold text-blue-600">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {showCreateFolder && (
        <RenameModal
          title="Create New Folder"
          currentName=""
          onSubmit={handleCreateFolder}
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {renameTarget && (
        <RenameModal
          title={`Rename ${renameTarget.type === 'folder' ? 'Folder' : 'File'}`}
          currentName={renameTarget.item.name}
          onSubmit={async (newName) => {
            if (renameTarget.type === 'folder') {
              await handleRenameFolder(renameTarget.item as FolderDto, newName);
            } else {
              await handleRenameFile(renameTarget.item as FileDto, newName);
            }
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}
    </div>
  );
};

export default FileBrowser;

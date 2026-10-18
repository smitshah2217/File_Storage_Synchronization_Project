import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, FolderPlus, Loader2, FolderOpen, AlertCircle, ChevronDown } from 'lucide-react';
import type { FolderDto, FileDto, FolderContentDto } from '../types';
import { folderApi } from '../api/folderApi';
import { fileApi } from '../api/fileApi';
import BreadcrumbNav from '../components/files/BreadcrumbNav';
import FolderCard from '../components/files/FolderCard';
import FileCard from '../components/files/FileCard';
import PreviewModal from '../components/files/PreviewModal';
import RenameModal from '../components/files/RenameModal';
import ShareModal from '../components/files/ShareModal';
import VersionHistoryModal from '../components/files/VersionHistoryModal';
import MovePickerModal from '../components/files/MovePickerModal';

const errorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMessage || fallback;
};

const FileBrowser = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const currentFolderId = folderId ? Number(folderId) : null;
  const [contents, setContents] = useState<FolderContentDto | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const [previewFile, setPreviewFile] = useState<FileDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; item: FileDto | FolderDto } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [shareFile, setShareFile] = useState<FileDto | null>(null);
  const [historyFile, setHistoryFile] = useState<FileDto | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ type: 'file' | 'folder'; item: FileDto | FolderDto } | null>(null);

  const fetchContents = useCallback(async (requestedPage = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const data = currentFolderId
        ? await folderApi.getFolderContents(currentFolderId, requestedPage)
        : await folderApi.getRootContents(requestedPage);
      let nextBreadcrumbs: FolderDto[] = [];
      if (currentFolderId) nextBreadcrumbs = await folderApi.getBreadcrumb(currentFolderId);
      setBreadcrumbs(nextBreadcrumbs);
      setContents((previous) => {
        if (!append || !previous) return data;
        return {
          folder: data.folder,
          subfolders: { ...data.subfolders, content: [...previous.subfolders.content, ...data.subfolders.content] },
          files: { ...data.files, content: [...previous.files.content, ...data.files.content] },
        };
      });
    } catch (fetchError) {
      const message = errorMessage(fetchError, 'Could not load this folder. Try again.');
      setError(message);
      throw fetchError;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentFolderId]);

  const refreshContents = useCallback(async () => {
    setPage(0);
    await fetchContents(0, false);
  }, [fetchContents]);

  useEffect(() => {
    setPage(0);
    setContents(null);
    void fetchContents(0, false).catch(() => undefined);
  }, [fetchContents]);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError('');
    const files = Array.from(fileList);
    try {
      if (files.length === 1) await fileApi.uploadFile(files[0], currentFolderId);
      else await fileApi.uploadBatch(files, currentFolderId);
      await refreshContents();
    } catch (uploadError) {
      await fetchContents(0, false).catch(() => undefined);
      setError(errorMessage(uploadError, 'One or more files could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => { event.preventDefault(); setDragOver(true); };
  const handleDragLeave = (event: React.DragEvent) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setDragOver(false);
  };
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    void handleFileUpload(event.dataTransfer.files);
  };

  const handleCreateFolder = async (name: string) => {
    await folderApi.createFolder(name, currentFolderId);
    await refreshContents();
  };
  const handleRenameFolder = async (folder: FolderDto, newName: string) => {
    await folderApi.updateFolder(folder.id, { name: newName });
    await refreshContents();
  };
  const handleDeleteFolder = async (folder: FolderDto) => {
    if (!window.confirm(`Move “${folder.name}” to Trash?`)) return;
    await folderApi.deleteFolder(folder.id);
    await refreshContents();
  };
  const handleMoveItem = async (destinationFolderId: number | null) => {
    if (!moveTarget) return;
    if (moveTarget.type === 'folder') {
      await folderApi.updateFolder(moveTarget.item.id, destinationFolderId === null
        ? { moveToRoot: true }
        : { parentFolderId: destinationFolderId });
    } else {
      await fileApi.updateFile(moveTarget.item.id, destinationFolderId === null
        ? { moveToRoot: true }
        : { folderId: destinationFolderId });
    }
    await refreshContents();
  };
  const handleRenameFile = async (file: FileDto, newName: string) => {
    await fileApi.updateFile(file.id, { name: newName });
    await refreshContents();
  };
  const handleDeleteFile = async (file: FileDto) => {
    if (!window.confirm(`Move “${file.name}” to Trash?`)) return;
    await fileApi.deleteFile(file.id);
    await refreshContents();
  };

  const subfolders = contents?.subfolders.content ?? [];
  const files = contents?.files.content ?? [];
  const isEmpty = contents && subfolders.length === 0 && files.length === 0;
  const hasMore = useMemo(() => Boolean(contents && (
    page + 1 < contents.subfolders.totalPages || page + 1 < contents.files.totalPages
  )), [contents, page]);

  const loadMore = async () => {
    const nextPage = page + 1;
    try {
      await fetchContents(nextPage, true);
      setPage(nextPage);
    } catch {
      // The inline error banner provides the failure message.
    }
  };

  return (
    <div
      className={`h-full rounded-2xl transition-colors duration-200 ${dragOver ? 'ring-2 ring-[#638ECB] ring-offset-4 bg-[#D5DEEF]/40' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <BreadcrumbNav breadcrumbs={breadcrumbs} />
          <h1 className="text-2xl font-bold text-[#395886]">
            {currentFolderId ? contents?.folder?.name || 'Folder' : 'My Files'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 rounded-xl border border-[#D5DEEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#395886] shadow-sm transition-all hover:border-[#8AAEE0] hover:bg-[#F0F3FA]"
          >
            <FolderPlus className="h-4 w-4 text-[#638ECB]" /> New Folder
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#638ECB] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#638ECB]/25 transition-all hover:bg-[#395886]">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
            <input
              type="file"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                void handleFileUpload(event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex h-64 items-center justify-center text-[#8AAEE0]"><Loader2 className="h-8 w-8 animate-spin" /></div>
      )}

      {!loading && isEmpty && (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D5DEEF] bg-white/60 text-[#8AAEE0]">
          <FolderOpen className="mb-4 h-16 w-16 text-[#8AAEE0]/60" />
          <p className="text-lg font-semibold text-[#395886]">This folder is empty</p>
          <p className="mt-1 text-sm text-[#638ECB]">Drop files here or click Upload to get started.</p>
        </div>
      )}

      {!loading && contents && !isEmpty && (
        <div className="space-y-8">
          {subfolders.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8AAEE0]">Folders</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {subfolders.map((folder) => (
                  <FolderCard key={folder.id} folder={folder}
                    onRename={(item) => setRenameTarget({ type: 'folder', item })}
                    onMove={(item) => setMoveTarget({ type: 'folder', item })}
                    onDelete={handleDeleteFolder} />
                ))}
              </div>
            </section>
          )}
          {files.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8AAEE0]">Files</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {files.map((file) => (
                  <FileCard key={file.id} file={file}
                    onRename={(item) => setRenameTarget({ type: 'file', item })}
                    onMove={(item) => setMoveTarget({ type: 'file', item })}
                    onDelete={handleDeleteFile}
                    onPreview={(item) => setPreviewFile(item)}
                    onShare={(item) => setShareFile(item)}
                    onHistory={(item) => setHistoryFile(item)} />
                ))}
              </div>
            </section>
          )}
          {hasMore && (
            <div className="flex justify-center py-3">
              <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
                className="flex items-center gap-2 rounded-xl border border-[#D5DEEF] bg-white px-5 py-2.5 text-sm font-semibold text-[#395886] shadow-sm hover:border-[#8AAEE0] disabled:opacity-60">
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-blue-400 bg-white px-12 py-10 shadow-2xl">
            <Upload className="h-12 w-12 text-blue-500" />
            <p className="text-lg font-semibold text-blue-600">Drop files to upload</p>
          </div>
        </div>
      )}

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {showCreateFolder && <RenameModal title="Create New Folder" currentName="" onSubmit={handleCreateFolder} onClose={() => setShowCreateFolder(false)} />}
      {renameTarget && (
        <RenameModal
          title={`Rename ${renameTarget.type === 'folder' ? 'Folder' : 'File'}`}
          currentName={renameTarget.item.name}
          onSubmit={async (newName) => {
            if (renameTarget.type === 'folder') await handleRenameFolder(renameTarget.item as FolderDto, newName);
            else await handleRenameFile(renameTarget.item as FileDto, newName);
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
      {historyFile && <VersionHistoryModal file={historyFile} onClose={() => setHistoryFile(null)} onVersionRestored={refreshContents} />}
      {moveTarget && (
        <MovePickerModal
          itemName={moveTarget.item.name}
          currentFolderId={moveTarget.type === 'folder'
            ? (moveTarget.item as FolderDto).parentFolderId
            : (moveTarget.item as FileDto).folderId}
          onMove={handleMoveItem}
          onClose={() => setMoveTarget(null)}
        />
      )}
    </div>
  );
};

export default FileBrowser;

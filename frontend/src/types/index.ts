export interface User {
  id: number;
  username: string;
}

export interface FolderDto {
  id: number;
  name: string;
  parentFolderId: number | null;
  ownerId: number;
  createdAt: string;
}

export interface FileDto {
  id: number;
  name: string;
  folderId: number | null;
  ownerId: number;
  sizeBytes: number;
  mimeType: string;
  versionNumber: number;
  createdAt: string;
}

export interface FolderContentDto {
  folder: FolderDto | null;
  subfolders: FolderDto[];
  files: FileDto[];
}

export interface TrashContentsDto {
  trashedFolders: FolderDto[];
  trashedFiles: FileDto[];
}

export interface StorageUsageDto {
  storageUsedBytes: number;
  storageLimitBytes: number;
}

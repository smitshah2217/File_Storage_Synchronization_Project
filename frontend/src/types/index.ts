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

export interface ShareDto {
  id: number;
  fileId: number;
  fileName: string;
  sharedByUserId: number;
  sharedByUsername: string;
  sharedWithUserId: number | null;
  sharedWithUsername: string | null;
  isPublic: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface FileVersionDto {
  id: number;
  fileId: number;
  versionNumber: number;
  sizeBytes: number;
  createdAt: string;
}

export interface DownloadHistoryDto {
  id: number;
  fileId: number;
  fileName: string;
  downloadedAt: string;
  ipAddress: string;
}

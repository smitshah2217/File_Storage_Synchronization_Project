export interface User {
  id: number;
  username: string;
  email?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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
  subfolders: PageResponse<FolderDto>;
  files: PageResponse<FileDto>;
}

export interface TrashContentsDto {
  folders: PageResponse<FolderDto>;
  files: PageResponse<FileDto>;
}

export interface StorageUsageDto {
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export interface ShareDto {
  id: number;
  fileId: number;
  fileName: string;
  ownerId: number;
  ownerUsername: string;
  sharedWithUserId: number;
  sharedWithUsername: string;
  permission: 'VIEW' | 'EDIT';
  createdAt: string;
}

export interface FileVersionDto {
  id: number;
  fileId: number;
  versionNumber: number;
  sizeBytes: number;
  mimeType: string;
  uploadedById: number | null;
  uploadedByUsername: string | null;
  uploadedAt: string;
}

export interface DownloadHistoryDto {
  id: number;
  fileId: number | null;
  fileNameSnapshot: string;
  downloadedAt: string;
}

export interface SearchResultDto {
  folders: PageResponse<FolderDto>;
  files: PageResponse<FileDto>;
}

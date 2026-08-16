import {  useEffect, useState  } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, FolderOpen, File as FileIcon } from 'lucide-react';
import { searchApi } from '../api/searchApi';
import type {  FileDto, FolderDto  } from '../types';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ files: FileDto[]; folders: FolderDto[] } | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    searchApi.search(query)
      .then((data) => setResults(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  const isEmpty = results && results.files.length === 0 && results.folders.length === 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Search Results</h1>
        <p className="text-sm text-slate-400 mt-1">
          Showing results for "<span className="text-slate-600 font-medium">{query}</span>"
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {!loading && isEmpty && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <SearchIcon className="w-16 h-16 mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">No results found</p>
          <p className="text-sm mt-1">Try a different search term.</p>
        </div>
      )}

      {!loading && results && !isEmpty && (
        <div className="space-y-2">
          {results.folders.map((folder) => (
            <Link
              key={`folder-${folder.id}`}
              to={`/folder/${folder.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-slate-700">{folder.name}</p>
                <p className="text-xs text-slate-400">Folder</p>
              </div>
            </Link>
          ))}

          {results.files.map((file) => (
            <div
              key={`file-${file.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center">
                <FileIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.sizeBytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;

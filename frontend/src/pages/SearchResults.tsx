import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, FolderOpen, File as FileIcon } from 'lucide-react';
import { searchApi } from '../api/searchApi';
import type { FileDto, FolderDto } from '../types';

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
        <h1 className="text-2xl font-bold text-[#395886]">Search Results</h1>
        <p className="text-sm text-[#638ECB] mt-1">
          Showing results for "<span className="text-[#395886] font-bold">{query}</span>"
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64 text-[#8AAEE0]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {!loading && isEmpty && (
        <div className="flex flex-col items-center justify-center h-64 text-[#8AAEE0] bg-white/60 rounded-2xl border-2 border-dashed border-[#D5DEEF]">
          <SearchIcon className="w-16 h-16 mb-4 text-[#8AAEE0]/50" />
          <p className="text-lg font-semibold text-[#395886]">No results found</p>
          <p className="text-sm mt-1 text-[#638ECB]">Try a different search term.</p>
        </div>
      )}

      {!loading && results && !isEmpty && (
        <div className="space-y-3">
          {results.folders.map((folder) => (
            <Link
              key={`folder-${folder.id}`}
              to={`/folder/${folder.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white border border-[#D5DEEF] rounded-2xl hover:shadow-md hover:border-[#8AAEE0] transition-all"
            >
              <div className="w-10 h-10 bg-[#F0F3FA] text-[#638ECB] rounded-xl flex items-center justify-center border border-[#D5DEEF]/60">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-[#395886]">{folder.name}</p>
                <p className="text-xs text-[#8AAEE0]">Folder</p>
              </div>
            </Link>
          ))}

          {results.files.map((file) => (
            <div
              key={`file-${file.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white border border-[#D5DEEF] rounded-2xl hover:shadow-md hover:border-[#8AAEE0] transition-all"
            >
              <div className="w-10 h-10 bg-[#F0F3FA] text-[#638ECB] rounded-xl flex items-center justify-center border border-[#D5DEEF]/60">
                <FileIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#395886] truncate">{file.name}</p>
                <p className="text-xs text-[#8AAEE0]">{formatBytes(file.sizeBytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2, FolderOpen, File as FileIcon, Download, AlertCircle, ChevronDown } from 'lucide-react';
import { searchApi } from '../api/searchApi';
import { fileApi } from '../api/fileApi';
import type { FileDto, FolderDto, SearchResultDto } from '../types';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Number((bytes / 1024 ** index).toFixed(2))} ${units[index]}`;
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResultDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPage(0);
    setResults(null);
    setLoading(false);
    setLoadingMore(false);
    setError('');
    if (!query.trim()) return;
    setLoading(true);
    searchApi.search(query.trim(), 0)
      .then((data) => { if (!cancelled) setResults(data); })
      .catch((requestError) => {
        if (!cancelled) setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Search failed. Try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  const loadMore = async () => {
    if (!results) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError('');
    try {
      const next = await searchApi.search(query.trim(), nextPage);
      setResults((previous) => previous ? {
        folders: { ...next.folders, content: [...previous.folders.content, ...next.folders.content] },
        files: { ...next.files, content: [...previous.files.content, ...next.files.content] },
      } : next);
      setPage(nextPage);
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not load more results.');
    } finally { setLoadingMore(false); }
  };

  const folders: FolderDto[] = results?.folders.content ?? [];
  const files: FileDto[] = results?.files.content ?? [];
  const isEmpty = results && folders.length === 0 && files.length === 0;
  const hasMore = Boolean(results && (
    page + 1 < results.folders.totalPages || page + 1 < results.files.totalPages
  ));

  return (
    <div>
      <div className="mb-8"><h1 className="text-2xl font-bold text-[#395886]">Search Results</h1><p className="mt-1 text-sm text-[#638ECB]">Showing results for “<span className="font-bold text-[#395886]">{query}</span>”</p></div>
      {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading && <div className="flex h-64 items-center justify-center text-[#8AAEE0]"><Loader2 className="h-8 w-8 animate-spin" /></div>}
      {!loading && isEmpty && <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D5DEEF] bg-white/60 text-[#8AAEE0]"><SearchIcon className="mb-4 h-16 w-16 text-[#8AAEE0]/50" /><p className="text-lg font-semibold text-[#395886]">No results found</p><p className="mt-1 text-sm text-[#638ECB]">Try a different search term.</p></div>}
      {!loading && results && !isEmpty && (
        <div className="space-y-3">
          {folders.map((folder) => <Link key={`folder-${folder.id}`} to={`/folder/${folder.id}`} className="flex items-center gap-4 rounded-2xl border border-[#D5DEEF] bg-white px-5 py-4 transition-all hover:border-[#8AAEE0] hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D5DEEF]/60 bg-[#F0F3FA] text-[#638ECB]"><FolderOpen className="h-5 w-5" /></div><div><p className="font-semibold text-[#395886]">{folder.name}</p><p className="text-xs text-[#8AAEE0]">Folder</p></div></Link>)}
          {files.map((file) => <div key={`file-${file.id}`} className="flex items-center gap-4 rounded-2xl border border-[#D5DEEF] bg-white px-5 py-4 transition-all hover:border-[#8AAEE0] hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D5DEEF]/60 bg-[#F0F3FA] text-[#638ECB]"><FileIcon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#395886]">{file.name}</p><p className="text-xs text-[#8AAEE0]">{formatBytes(file.sizeBytes)}</p></div><button onClick={() => void fileApi.downloadFile(file.id, file.name).catch((downloadError) => setError((downloadError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Download failed.'))} className="rounded-lg p-2 text-[#638ECB] hover:bg-[#F0F3FA] hover:text-[#395886]" aria-label={`Download ${file.name}`}><Download className="h-4 w-4" /></button></div>)}
          {hasMore && <div className="flex justify-center py-3"><button onClick={() => void loadMore()} disabled={loadingMore} className="flex items-center gap-2 rounded-xl border border-[#D5DEEF] bg-white px-5 py-2.5 text-sm font-semibold text-[#395886] shadow-sm hover:border-[#8AAEE0] disabled:opacity-60">{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}Load more</button></div>}
        </div>
      )}
    </div>
  );
};

export default SearchResults;

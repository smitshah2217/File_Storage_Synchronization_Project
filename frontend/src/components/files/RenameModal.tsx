import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

interface RenameModalProps {
  title: string;
  currentName: string;
  onSubmit: (newName: string) => Promise<void>;
  onClose: () => void;
}

const RenameModal: React.FC<RenameModalProps> = ({ title, currentName, onSubmit, onClose }) => {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === currentName) { onClose(); return; }

    setLoading(true);
    setError('');
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#D5DEEF] w-full max-w-md p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#395886]">{title}</h2>
          <button onClick={onClose} className="p-1 text-[#8AAEE0] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-[#F0F3FA] border border-[#D5DEEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8AAEE0]/30 focus:border-[#638ECB] text-[#395886] placeholder-[#8AAEE0] transition-all text-sm"
            placeholder="Enter name..."
          />
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-[#638ECB] hover:text-[#395886] hover:bg-[#F0F3FA] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#638ECB] hover:bg-[#395886] rounded-xl transition-all shadow-md shadow-[#638ECB]/25 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameModal;

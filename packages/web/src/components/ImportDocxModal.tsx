import { useState, useRef } from 'react';
import { useStore } from '../store';
import { Upload, FileText, X } from 'lucide-react';

interface ImportDocxModalProps {
  onClose: () => void;
}

export function ImportDocxModal({ onClose }: ImportDocxModalProps) {
  const { importDocxFile, addToast } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) {
      setSelectedFile(file);
    } else {
      addToast({ type: 'error', message: 'Please select a .docx file' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      await importDocxFile(selectedFile);
      addToast({ type: 'success', message: `Imported ${selectedFile.name}` });
      onClose();
    } catch (error) {
      addToast({ type: 'error', message: 'Failed to import document' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--editor-fg)' }}>
            Import from Word
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--editor-fg)' }}>
            Import a Microsoft Word document (.docx) and convert it to Markdown.
          </p>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-editor-accent bg-sidebar-active' : 'border-tab-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={48} className="opacity-60" />
                <p className="font-medium" style={{ color: 'var(--editor-fg)' }}>
                  {selectedFile.name}
                </p>
                <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  className="text-sm text-editor-accent hover:underline mt-2"
                  onClick={() => setSelectedFile(null)}
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={48} className="opacity-40" />
                <p style={{ color: 'var(--editor-fg)' }}>
                  Drag and drop a .docx file here
                </p>
                <p className="text-sm opacity-60" style={{ color: 'var(--editor-fg)' }}>
                  or
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="btn btn-primary"
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}


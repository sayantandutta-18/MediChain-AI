import { UploadCloud, X } from 'lucide-react';
import { useCallback, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { recordsApi } from '@/api/records';
import { toApiError } from '@/api/client';
import { Alert, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { formatBytes } from '@/utils/format';
import { RECORD_CATEGORIES, RECORD_CATEGORY_LABELS, type MedicalRecord, type RecordCategory } from '@/types';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.txt,.json,.csv';

interface UploadRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (record: MedicalRecord) => void;
}

export const UploadRecordModal = ({ isOpen, onClose, onUploaded }: UploadRecordModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>('lab-report');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setTitle('');
    setCategory('lab-report');
    setDescription('');
    setError(null);
    setIsDragging(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const close = () => {
    if (isUploading) return;
    reset();
    onClose();
  };

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (candidate.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(candidate.size)}. The limit is ${formatBytes(MAX_BYTES)}.`);
      return;
    }
    setError(null);
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 160));
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    if (title.trim().length < 3) {
      setError('Give the record a title of at least 3 characters.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const record = await recordsApi.upload({
        file,
        title: title.trim(),
        category,
        description: description.trim() || undefined,
      });
      onUploaded(record);
      reset();
      onClose();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Upload a medical record"
      description="The file is hashed, encrypted, then stored. Only the digest is anchored on chain."
      footer={
        <>
          <button type="button" onClick={close} className="btn-ghost" disabled={isUploading}>
            Cancel
          </button>
          <button type="submit" form="upload-record-form" className="btn-primary" disabled={isUploading || !file}>
            {isUploading ? <Spinner className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
            {isUploading ? 'Encrypting & anchoring…' : 'Upload securely'}
          </button>
        </>
      }
    >
      <form id="upload-record-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div>
          <span className="field-label">Medical document</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition ${
              isDragging
                ? 'border-signal-400/60 bg-signal-400/[0.08]'
                : 'border-white/20 bg-white/[0.02] hover:border-signal-400/40'
            }`}
          >
            <UploadCloud className="h-6 w-6 text-signal-300" aria-hidden="true" />
            <span className="text-sm text-slate-300">
              {file ? file.name : 'Click to choose or drag a file here'}
            </span>
            <span className="text-[11px] text-slate-500">
              {file ? formatBytes(file.size) : `PDF, image or text · max ${formatBytes(MAX_BYTES)}`}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
        </div>

        <div>
          <label htmlFor="record-title" className="field-label">
            Title
          </label>
          <input
            id="record-title"
            type="text"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="field"
            placeholder="Complete blood count"
            maxLength={160}
          />
        </div>

        <div>
          <label htmlFor="record-category" className="field-label">
            Category
          </label>
          <select
            id="record-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as RecordCategory)}
            className="field"
          >
            {RECORD_CATEGORIES.map((item) => (
              <option key={item} value={item} className="bg-ink-900">
                {RECORD_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="record-description" className="field-label">
            Note <span className="normal-case text-slate-600">(optional)</span>
          </label>
          <textarea
            id="record-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="field min-h-[80px] resize-y"
            placeholder="Anything your future self or your doctor should know about this document."
            maxLength={2000}
          />
        </div>

        {file ? (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Remove selected file
          </button>
        ) : null}
      </form>
    </Modal>
  );
};

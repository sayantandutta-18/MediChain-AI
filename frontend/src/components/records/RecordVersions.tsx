import { useEffect, useState } from 'react';
import { Download, FileUp, Hash, History } from 'lucide-react';
import { recordsApi } from '@/api/records';
import { useAuth } from '@/context/AuthContext';
import { formatBytes, formatDateTime } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';

interface RecordVersionsProps {
  recordId: string;
  onVersionUploaded: () => void;
}

export const RecordVersions = ({ recordId, onVersionUploaded }: RecordVersionsProps) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [recordId]);

  const loadVersions = async () => {
    try {
      const data = await recordsApi.getVersions(recordId);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load versions', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await recordsApi.uploadVersion(recordId, file);
      await loadVersions();
      onVersionUploaded();
    } catch (err) {
      console.error('Failed to upload new version', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (versionNumber: number, fileName: string) => {
    try {
      const blob = await recordsApi.downloadVersion(recordId, versionNumber);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download version', err);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-muted/30">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Version History</h2>
        </div>
        {user?.role === 'patient' && (
          <div>
            <input
              type="file"
              id="new-version-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <label htmlFor="new-version-upload">
              <span className={`btn-ghost btn-sm cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <FileUp className="mr-2 h-4 w-4 inline-block" />
                {isUploading ? 'Uploading...' : 'Upload New Version'}
              </span>
            </label>
          </div>
        )}
      </div>

      <div className="divide-y divide-border">
        {versions.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No historical versions available.</div>
        ) : (
          versions.map((v) => (
            <div key={v.versionNumber} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <span className="font-medium text-foreground">Version {v.versionNumber}</span>
                  {v.versionNumber === versions[0]?.versionNumber && (
                    <Badge label="Latest" className="bg-blue-500/10 text-blue-500 border-blue-500/20" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Uploaded on {formatDateTime(v.createdAt)}</p>
                  <p>{v.fileName} • {formatBytes(v.size)}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Hash className="h-3 w-3 mr-1" />
                    <span className="truncate max-w-[200px]" title={v.fileHash}>
                      {v.fileHash.substring(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button type="button" className="btn-ghost btn-sm" onClick={() => handleDownload(v.versionNumber, v.fileName)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

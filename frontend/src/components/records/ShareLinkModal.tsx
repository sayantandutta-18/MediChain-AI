import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Link2, KeyRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Spinner, Alert } from '@/components/ui/Feedback';
import { shareApi } from '@/api/share';
import { toError } from '@/context/AuthContext';
import { formatDateTime } from '@/utils/format';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
}

export const ShareLinkModal = ({ isOpen, onClose, recordId }: ShareLinkModalProps) => {
  const [tokenInfo, setTokenInfo] = useState<{ token: string; expiresAt: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (durationHours: number) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await shareApi.generateToken(recordId, durationHours);
      setTokenInfo(res);
      setCopied(false);
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!tokenInfo) return;
    const url = `${window.location.origin}/share/${tokenInfo.token}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Share Link"
      description="Generate a temporary access link for this medical record. Anyone with the link will be able to view and download the record until it expires."
    >
      <div className="space-y-5">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {!tokenInfo ? (
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => void handleGenerate(24)}
              disabled={isGenerating}
              className="btn-primary justify-center w-full"
            >
              {isGenerating ? <Spinner className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              Generate 24-Hour Link
            </button>
            <button
              onClick={() => void handleGenerate(168)}
              disabled={isGenerating}
              className="btn-ghost justify-center w-full"
            >
              Generate 7-Day Link
            </button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="rounded-xl border border-mint/20 bg-mint/[0.03] p-4 text-center">
              <div className="inline-block rounded-xl bg-white p-3 shadow-lg">
                <QRCodeSVG
                  value={`${window.location.origin}/share/${tokenInfo.token}`}
                  size={150}
                  level="Q"
                  includeMargin={false}
                />
              </div>
              <p className="mt-4 text-[11px] text-slate-400">
                Expires at {formatDateTime(tokenInfo.expiresAt)}
              </p>
            </div>

            <div>
              <label className="field-label">Secure link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/share/${tokenInfo.token}`}
                  className="field flex-1 text-sm text-slate-300 font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  className={`btn shrink-0 ${copied ? 'bg-mint text-ink-950' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {copied ? 'Copied!' : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => void handleGenerate(24)}
              className="btn-ghost btn-sm w-full justify-center text-xs"
            >
              <KeyRound className="h-3 w-3" />
              Regenerate link
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

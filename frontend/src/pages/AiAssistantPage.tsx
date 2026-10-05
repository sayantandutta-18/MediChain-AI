import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, Sparkles, Mic, MicOff } from 'lucide-react';
import { useAuth, toError } from '@/context/AuthContext';
import { aiApi } from '@/api/auditAi';
import { recordsApi } from '@/api/records';
import { Card, SectionHeading } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, EmptyState, ErrorState, SkeletonList, Spinner } from '@/components/ui/Feedback';
import { urgencyStyles } from '@/utils/styles';
import { formatDateTime } from '@/utils/format';
import type { AiReport, MedicalRecord } from '@/types';

export const AiAssistantPage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState('');
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState<'en' | 'simple-en'>('en');
  const [report, setReport] = useState<AiReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'simple-en' ? 'en-US' : 'en-US';
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(prev => (prev ? prev + ' ' : '') + transcript);
    };
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const [list, status] = await Promise.all([recordsApi.list({ limit: 50 }), aiApi.status()]);
      setRecords(list.items);
      setSelectedId((current) => current || (list.items[0]?.recordId ?? ''));
      setIsConfigured(status.configured);
    } catch (err) {
      setListError(toError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAnalyze = async () => {
    if (!selectedId) return;
    setIsAnalyzing(true);
    setError(null);
    setReport(null);
    try {
      setReport(
        await aiApi.analyze({
          recordId: selectedId,
          language,
          ...(question.trim() ? { question: question.trim() } : {}),
        }),
      );
    } catch (err) {
      setError(toError(err).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Assistance, not diagnosis"
        title="AI report assistant"
        description="Pick a record you already have access to and get a plain-language explanation. Provider credentials never leave the server."
      />

      {isConfigured === false ? (
        <div className="mb-6">
          <Alert tone="warning" title="AI provider not configured">
            The server has no <code className="font-mono text-xs">OPENAI_API_KEY</code>. The endpoint returns a
            controlled error instead of failing the whole backend. Set the key on the server to enable this
            feature.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card className="p-5">
          <h2 className="section-title">Choose a record</h2>

          {isLoading ? (
            <div className="mt-4">
              <SkeletonList count={3} />
            </div>
          ) : listError ? (
            <div className="mt-4">
              <ErrorState message={listError} onRetry={() => void load()} />
            </div>
          ) : records.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No records available"
                description={
                  user?.role === 'doctor'
                    ? 'You need an approved access grant before the AI can read a patient record.'
                    : 'Upload a record first to use the assistant.'
                }
                icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
                {...(user?.role === 'patient' ? { actionLabel: 'Go to records', actionTo: '/records' } : {})}
              />
            </div>
          ) : (
            <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {records.map((record) => {
                const isSelected = record.recordId === selectedId;
                return (
                  <li key={record.recordId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(record.recordId)}
                      className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                        isSelected
                          ? 'border-azure-400/50 bg-azure-500/10'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <span className="block truncate text-sm font-medium text-white">{record.title}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {record.fileName}
                        {record.hasPlainText ? ' · text readable' : ' · metadata only'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 space-y-3">
            <div>
              <label htmlFor="ai-question" className="field-label">
                What do you want to understand?
              </label>
              <div className="relative flex items-center">
                <input
                  id="ai-question"
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="e.g. What should I ask about these results?"
                  className="field pr-12"
                  maxLength={500}
                />
                <button 
                  type="button"
                  onClick={handleListen}
                  className={`absolute right-2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <span className="field-label">Reading level</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'en' as const, label: 'Standard' },
                  { value: 'simple-en' as const, label: 'Very simple' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLanguage(option.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      language === option.value
                        ? 'border-azure-400/50 bg-azure-500/10 text-azure-400'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedId || isAnalyzing}
              className="btn-primary w-full"
            >
              {isAnalyzing ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              {isAnalyzing ? 'Analysing the report…' : 'Explain this record'}
            </button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="section-title">Explanation</h2>

          {error ? (
            <div className="mt-5">
              <ErrorState title="The assistant could not help" message={error} onRetry={handleAnalyze} />
            </div>
          ) : null}

          {!error && !report && !isAnalyzing ? (
            <div className="mt-5">
              <EmptyState
                title="No explanation yet"
                description="Select a record and ask the assistant to explain it in plain language."
                icon={<HelpCircle className="h-6 w-6" aria-hidden="true" />}
              />
            </div>
          ) : null}

          {isAnalyzing ? (
            <div className="mt-5 space-y-3">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ) : null}

          {report ? (
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  label={urgencyStyles[report.urgency]?.label ?? report.urgency}
                  className={urgencyStyles[report.urgency]?.className ?? ''}
                />
                <span className="text-[11px] text-slate-600">
                  {report.model} · {formatDateTime(report.generatedAt)}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Summary</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{report.summary}</p>
              </div>

              {report.keyFindings.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Key findings
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {report.keyFindings.map((finding) => (
                      <li
                        key={finding}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-sm text-slate-300"
                      >
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.terminology.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Terminology
                  </p>
                  <dl className="mt-2 space-y-2">
                    {report.terminology.map((item) => (
                      <div key={item.term} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3.5">
                        <dt className="text-sm font-semibold text-signal-200">{item.term}</dt>
                        <dd className="mt-0.5 text-sm text-slate-400">{item.explanation}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  In plain language
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  {report.patientFriendlyExplanation}
                </p>
              </div>

              {report.suggestedQuestions.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Questions to ask your doctor
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {report.suggestedQuestions.map((item, index) => (
                      <li key={item} className="flex gap-2.5 text-sm text-slate-300">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-slate-400">
                          {index + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <Alert tone="warning" title="Not medical advice">
                {report.disclaimer}
              </Alert>

              <p className="text-xs text-slate-600">
                Want to review the source?{' '}
                <Link to={selectedId ? `/records/${selectedId}` : '/records'} className="link">
                  Open the record
                </Link>
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
};

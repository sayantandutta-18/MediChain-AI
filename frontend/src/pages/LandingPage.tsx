import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileKey2,
  Fingerprint,
  Link2,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UserCheck,
} from 'lucide-react';
import { SecurityPipeline } from '@/components/three/SecurityPipeline';
import { Logo } from '@/components/ui/Logo';

const PIPELINE_POINTS = [
  { icon: FileKey2, title: 'Encrypted before storage', body: 'AES-256-GCM protects every file at rest. The key never leaves the server environment.' },
  { icon: Fingerprint, title: 'SHA-256 integrity proof', body: 'A digest is computed for each document and stored alongside the record.' },
  { icon: Link2, title: 'Anchored on Sui testnet', body: 'The digest - never the document - is anchored on chain for independent verification.' },
  { icon: UserCheck, title: 'Patient-controlled consent', body: 'Doctors request access. Patients approve with an expiry, or reject and revoke at any time.' },
  { icon: TimerReset, title: 'Expiry and revocation', body: 'Access grants are time bounded. Expired, rejected and revoked grants never authorise a read.' },
  { icon: Sparkles, title: 'AI-assisted understanding', body: 'Reports are explained in plain language. Provider credentials stay server side.' },
];

const PRINCIPLES = [
  { value: 'Backend', label: 'authoritative' },
  { value: 'Append-only', label: 'audit trail' },
  { value: 'Least', label: 'privilege by default' },
];

export const LandingPage = () => (
  <div className="relative min-h-screen overflow-hidden">
    {/* ambient grid */}
    <div
      className="pointer-events-none absolute inset-0 bg-grid-fade bg-grid [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      aria-hidden="true"
    />

    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
      <Logo />
      <nav className="flex items-center gap-2 sm:gap-3">
        <a
          href="#how-it-works"
          className="hidden text-sm text-slate-400 transition hover:text-white sm:block"
        >
          How it works
        </a>
        <Link to="/login" className="btn-ghost btn-sm">
          Sign in
        </Link>
        <Link to="/register" className="btn-primary btn-sm">
          Get started
        </Link>
      </nav>
    </header>

    <main className="relative z-10">
      {/* Hero */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-signal-400/25 bg-signal-400/[0.07] px-3 py-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-signal-300" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-signal-200">
                Patient-controlled · Integrity-verified
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="heading-gradient mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Your medical records.
              <br />
              Your keys. Your call.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
            >
              MediChain-AI encrypts every record, proves its integrity with a SHA-256 digest anchored on
              Sui, and keeps every doctor access request under your explicit, revocable control.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link to="/register" className="btn-primary">
                Create your secure vault
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="btn-ghost">
                See the security pipeline
              </a>
            </motion.div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {PRINCIPLES.map((item) => (
                <div key={item.label} className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TRD-14: the 3D layer visualises the real pipeline, not decoration. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="glass relative h-[380px] overflow-hidden sm:h-[440px]"
          >
            <SecurityPipeline className="h-full w-full" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent p-4">
              <p className="text-center text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Live record flow · click a node to inspect
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Security pipeline</p>
          <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Six layers between a document and anyone who asks to read it
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_POINTS.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="glass glass-hover group p-5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-signal-400/20 bg-signal-400/10 text-signal-300 transition group-hover:border-signal-400/40">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              role: 'Patients',
              accent: 'from-signal-400/20 to-transparent',
              points: [
                'Upload, edit, download and delete your own records',
                'Decide every access request: approve with an expiry, or reject',
                'Revoke a granted relationship at any moment',
                'Verify each record against its on-chain digest',
                'Ask the AI assistant to explain a report in plain language',
              ],
            },
            {
              role: 'Doctors',
              accent: 'from-azure-500/20 to-transparent',
              points: [
                'Request access with a stated clinical reason',
                'See only records covered by an approved, unexpired grant',
                'View and download authorised documents',
                'Verify record integrity before relying on it',
                'Never able to modify or delete a patient’s record',
              ],
            },
          ].map((block) => (
            <div key={block.role} className="glass relative overflow-hidden p-6">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${block.accent}`} />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white">{block.role}</h3>
                <ul className="mt-4 space-y-2.5">
                  {block.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm text-slate-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal-400" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>

    <footer className="relative z-10 border-t border-white/[0.06] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs text-slate-600 sm:flex-row sm:text-left">
        <p>MediChain-AI · full-stack portfolio MVP</p>
        <p>Not a diagnostic or prescription system. Not a certified clinical product.</p>
      </div>
    </footer>
  </div>
);

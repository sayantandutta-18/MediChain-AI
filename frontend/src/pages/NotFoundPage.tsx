import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export const NotFoundPage = () => (
  <div className="grid min-h-screen place-items-center px-5">
    <div className="glass w-full max-w-md p-8 text-center">
      <div className="flex justify-center">
        <Logo />
      </div>
      <Compass className="mx-auto mt-8 h-10 w-10 text-signal-300" aria-hidden="true" />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Page not found</h1>
      <p className="mt-2 text-sm text-slate-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        <Link to="/dashboard" className="btn-primary">
          Go to dashboard
        </Link>
        <Link to="/" className="btn-ghost">
          Back to overview
        </Link>
      </div>
    </div>
  </div>
);

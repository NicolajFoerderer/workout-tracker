import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { signInWithMagicLink } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Check your email for the login link!' });
      setEmail('');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">Workout</h1>
          <p className="text-zinc-500 mt-2">Track your progress</p>
        </div>

        <div className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 px-4 rounded-xl font-medium hover:bg-zinc-200 disabled:bg-zinc-600 disabled:text-zinc-400 transition-colors"
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-zinc-600 mt-6">
          We'll send you a magic link to sign in
        </p>
      </div>
    </div>
  );
}

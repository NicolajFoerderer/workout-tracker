import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/history', label: 'History' },
    { path: '/progress', label: 'Progress' },
    { path: '/exercises', label: 'Exercises' },
    { path: '/templates', label: 'Templates' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] pb-20">
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-lg border-b border-zinc-800/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-zinc-500 truncate max-w-[200px]">
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/80 backdrop-blur-lg border-t border-zinc-800/50 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-4 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

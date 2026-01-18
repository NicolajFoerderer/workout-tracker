import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/history', label: 'History', icon: '📋' },
    { path: '/progress', label: 'Progress', icon: '📈' },
    { path: '/exercises', label: 'Exercises', icon: '💪' },
    { path: '/templates', label: 'Templates', icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <span className="text-sm text-gray-600 truncate max-w-[200px]">
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-3 text-xs ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ProductList } from './components/ProductList';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ShoppingCart, User, LogOut, Home, Package } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register' | 'dashboard' | 'admin'>('home');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await fetchUserData(session.access_token);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (token: string) => {
    try {
      console.log('Fetching user data with token:', token.slice(0, 10) + '...');
      // First try to get the user directly from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError) {
        console.error('Error getting user from Supabase:', userError);
        throw userError;
      }

      if (!user) {
        throw new Error('No user data received from Supabase');
      }

      // Set basic user info
      setUser({
        id: user.id,
        email: user.email,
        role: user.app_metadata?.role || 'user',
        name: user.user_metadata?.full_name || user.email
      });

      // Set the view based on role
      setCurrentView(user.app_metadata?.role === 'admin' ? 'admin' : 'home');

      setCurrentView('home');
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Reset state on error
      setUser(null);
      setAccessToken(null);
      setCurrentView('login');
      throw error; // Re-throw to handle in caller
    }
  };

  const handleLoginSuccess = async (token: string) => {
    console.log('Login success handler called with token');
    setAccessToken(token);
    try {
      await fetchUserData(token);
      console.log('User data fetched successfully');
    } catch (error) {
      console.error('Error in handleLoginSuccess:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
      setUser(null);
      setCurrentView('home');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setCurrentView('home')}
                className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-xl">TFP</span>
              </button>
              
              {user && (
                <div className="hidden md:flex space-x-4">
                  <button
                    onClick={() => setCurrentView('home')}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span>Browse</span>
                  </button>
                  {user.role === 'user' && (
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <Package className="h-4 w-4" />
                      <span>My Dashboard</span>
                    </button>
                  )}
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setCurrentView('admin')}
                      className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {user.name} {user.role === 'admin' && '(Admin)'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex space-x-2 items-center">
                  <a
                    href="/aboutus.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-gray-700 hover:text-blue-600 rounded-md transition-colors"
                  >
                    About Us
                  </a>
                  <button
                    onClick={() => setCurrentView('login')}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setCurrentView('register')}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {currentView === 'home' && (
          <ProductList 
            accessToken={accessToken} 
            user={user}
            onLoginRequired={() => setCurrentView('login')}
          />
        )}
        {currentView === 'login' && (
          <Login
            onSuccess={handleLoginSuccess}
            onRegisterClick={() => setCurrentView('register')}
          />
        )}
        {currentView === 'register' && (
          <Register
            onSuccess={() => setCurrentView('login')}
            onLoginClick={() => setCurrentView('login')}
          />
        )}
        {currentView === 'dashboard' && user && user.role === 'user' && (
          <UserDashboard
            accessToken={accessToken!}
            user={user}
          />
        )}
        {currentView === 'admin' && user && user.role === 'admin' && (
          <AdminDashboard
            accessToken={accessToken!}
            user={user}
          />
        )}
      </main>
    </div>
  );
}

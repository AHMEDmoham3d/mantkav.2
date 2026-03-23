import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';
import Login from './pages/Login';
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CoachDashboard = lazy(() => import('./pages/CoachDashboard'));

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-lg"></div>
          <p className="text-xl font-semibold text-gray-700">جاري تحميل اللوحة...</p>
          <p className="text-gray-500 mt-2">سيتم تحميل الصفحة خلال ثواني</p>
        </div>
      </div>
    }>
      {role === 'admin' && <AdminDashboard />}
      {role === 'coach' && <CoachDashboard />}
      {role !== 'admin' && role !== 'coach' && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
          <div className="text-center p-8 max-w-md mx-auto">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="w-12 h-12 text-gray-500">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">لا يوجد صلاحية للوصول</h2>
            <p className="text-gray-600 mb-8">صلاحيات حسابك لا تسمح بالوصول لهذه الصفحة. يرجى التواصل مع الإدارة.</p>
          </div>
        </div>
      )}
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

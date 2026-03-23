import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Building2, Users, UserCircle, Calendar, Plus, Edit } from 'lucide-react';

type TabType = 'organizations' | 'coaches' | 'players' | 'exam_periods' | 'secondary_registration_periods' | 'championship_periods' | 'active_periods';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // const [filterPeriod, setFilterPeriod] = useState<string | null>(null); // Unused filter removed

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    let query: any = [];
    try {
      switch (activeTab) {
        case 'organizations':
const { data: orgs } = await supabase.from('organizations').select('*');
          query = orgs || [];
          break;
        case 'coaches':
const { data: coaches } = await supabase.from('profiles').select('*').eq('role', 'coach');
          query = coaches || [];
          break;
        case 'players':
const { data: playersData } = await supabase.from('players').select('*');
          query = playersData || [];
          break;
        case 'exam_periods':
const { data: exams } = await supabase.from('exam_periods').select('*');
          query = exams || [];
          break;
        case 'secondary_registration_periods':
const { data: secondary } = await supabase.from('secondary_registration_periods').select('*');
          query = secondary || [];
          break;
        case 'championship_periods':
          const { data: champs } = await supabase.from('championship_periods').select('*');
          query = champs || [];
          break;
        case 'active_periods':
          const today = new Date().toISOString().split('T')[0];
          const { data: examActive } = await supabase.from('exam_periods').select('*').lte('start_date', today).gte('end_date', today).limit(1);
          const { data: secondaryActive } = await supabase.from('secondary_registration_periods').select('*').lte('start_date', today).gte('end_date', today).limit(1);
          const { data: champActive } = await supabase.from('championship_periods').select('*').lte('start_date', today).gte('end_date', today).limit(1);
          query = [
            ...(examActive || []),
            ...(secondaryActive || []),
            ...(champActive || [])
          ];
          break;
        default:
          query = [];
      }

      // Removed unused player filtering by registration_type

      setData(Array.isArray(query) ? query : [query]);
    } catch (error) {
      console.error('Error loading data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await supabase.from(activeTab).delete().eq('id', id); // Delete item
      loadData();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const renderTable = () => {
    if (loading) return <div className="text-center py-8">جاري التحميل...</div>;

    if (data.length === 0) return <div className="text-center py-8 text-gray-500">لا توجد بيانات</div>;

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الاسم
              </th>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item: any, index: number) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  {item.name || item.full_name || item.file_number || `عنصر ${index + 1}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('ar') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2">
                  <button 
                    onClick={() => handleDelete(item.id || index.toString())}
                    className="text-red-600 hover:text-red-900"
                  >
                    حذف
                  </button>
                  <Edit className="w-4 h-4 text-blue-600 hover:text-blue-800 cursor-pointer" aria-label="تعديل" />
                  <Plus className="w-4 h-4 text-green-600 hover:text-green-800 cursor-pointer" aria-label="إضافة" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            لوحة تحكم الإدارة
          </h1>
          <button
            onClick={() => alert('تم تسجيل الخروج (محاكاة)')}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex flex-wrap gap-4 mb-12">
            <button
              onClick={() => alert('فتح نموذج إضافة لاعب')}
              className="px-8 py-4 rounded-2xl bg-green-500 text-white font-semibold transition-all duration-300 shadow-lg hover:bg-green-600"
            >
              إضافة لاعب
            </button>
            {(['organizations', 'coaches', 'players', 'exam_periods', 'secondary_registration_periods', 'championship_periods', 'active_periods'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/50 -translate-y-1'
                    : 'bg-white/60 hover:bg-white hover:shadow-xl text-gray-800 border border-gray-200/50 hover:border-blue-200'
                }`}
              >
                {tab === 'organizations' && <Building2 size={20} className="inline ml-2" />}
                {tab === 'coaches' && <Users size={20} className="inline ml-2" />}
                {tab === 'players' && <UserCircle size={20} className="inline ml-2" />}
                {tab === 'exam_periods' && <Calendar size={20} className="inline ml-2" />}
                {tab === 'active_periods' ? 'الفترات النشطة' : tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>

          <div>
            {renderTable()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
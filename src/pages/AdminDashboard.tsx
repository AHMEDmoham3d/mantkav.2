import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Organization, Coach, Player } from '../lib/supabase';
import {
  LogOut,
  Building2,
  Users,
  UserCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Calendar,
  Trophy,
  BookOpen,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  FileText
} from 'lucide-react';

type TabType = 'organizations' | 'coaches' | 'players' | 'examPeriods' | 'secondaryPeriods' | 'championshipPeriods' | 'viewRegistrations';

// Interfaces for the periods
interface ExamPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface SecondaryPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface ChampionshipPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

// Interface for grouped registrations
interface CoachRegistrationGroup {
  coachId: string;
  coachName: string;
  coachEmail?: string;
  organizationName: string;
  players: {
    id: string;
    name: string;
    birth_date: string;
    belt_level: string;
  }[];
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
  const [secondaryPeriods, setSecondaryPeriods] = useState<SecondaryPeriod[]>([]);
  const [championshipPeriods, setChampionshipPeriods] = useState<ChampionshipPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for viewing registrations
  const [selectedPeriodType, setSelectedPeriodType] = useState<'exam' | 'secondary' | 'championship'>('exam');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [registrationsGroups, setRegistrationsGroups] = useState<CoachRegistrationGroup[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [searchCoachTerm, setSearchCoachTerm] = useState('');
  const [expandedCoaches, setExpandedCoaches] = useState<Set<string>>(new Set());
  const [periodsForDropdown, setPeriodsForDropdown] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'viewRegistrations') {
      loadPeriodsForDropdown();
    }
  }, [activeTab, selectedPeriodType]);

  useEffect(() => {
    if (activeTab === 'viewRegistrations' && selectedPeriodId) {
      loadRegistrations();
    }
  }, [selectedPeriodId, selectedPeriodType, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'organizations') {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setOrganizations(data || []);
      } else if (activeTab === 'coaches') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, organization:organizations(*)')
          .eq('role', 'coach')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setCoaches(data || []);
      } else if (activeTab === 'players') {
        const { data, error } = await supabase
          .from('players')
          .select('*, coach:profiles(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPlayers(data || []);
      } else if (activeTab === 'examPeriods') {
        const { data, error } = await supabase
          .from('exam_periods')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setExamPeriods(data || []);
      } else if (activeTab === 'secondaryPeriods') {
        const { data, error } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setSecondaryPeriods(data || []);
      } else if (activeTab === 'championshipPeriods') {
        const { data, error } = await supabase
          .from('tournament_periods')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setChampionshipPeriods(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodsForDropdown = async () => {
    try {
      let data;
      if (selectedPeriodType === 'exam') {
        const { data: examData, error } = await supabase
          .from('exam_periods')
          .select('id, name, start_date, end_date')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = examData;
      } else if (selectedPeriodType === 'secondary') {
        const { data: secondaryData, error } = await supabase
          .from('secondary_registration_periods')
          .select('id, name, start_date, end_date')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = secondaryData;
      } else {
        const { data: champData, error } = await supabase
          .from('tournament_periods')
          .select('id, name, start_date, end_date')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = champData;
      }
      setPeriodsForDropdown(data || []);
      if (data && data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0].id);
      } else if (data && data.length === 0) {
        setSelectedPeriodId('');
        setRegistrationsGroups([]);
      }
    } catch (error) {
      console.error('Error loading periods:', error);
      alert('حدث خطأ أثناء تحميل الفترات');
    }
  };

  const loadRegistrations = async () => {
    if (!selectedPeriodId) {
      setRegistrationsGroups([]);
      return;
    }

    setViewLoading(true);
    try {
      let registrations: any[] = [];
      
      if (selectedPeriodType === 'exam') {
        const { data, error } = await supabase
          .from('exam_registrations')
          .select(`
            *,
            coach:coach_id (
              id, 
              full_name, 
              email,
              organization:organization_id (
                name
              )
            )
          `)
          .eq('exam_period_id', selectedPeriodId);
        
        if (error) throw error;
        registrations = data || [];
      } else if (selectedPeriodType === 'secondary') {
        const { data, error } = await supabase
          .from('secondary_registrations')
          .select(`
            *,
            coach:coach_id (
              id, 
              full_name, 
              email,
              organization:organization_id (
                name
              )
            )
          `)
          .eq('secondary_period_id', selectedPeriodId);
        
        if (error) throw error;
        registrations = data || [];
      } else {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select(`
            *,
            coach:coach_id (
              id, 
              full_name, 
              email,
              organization:organization_id (
                name
              )
            )
          `)
          .eq('tournament_period_id', selectedPeriodId);
        
        if (error) throw error;
        registrations = data || [];
      }

      // Group by coach
      const groupsMap = new Map<string, CoachRegistrationGroup>();
      
      registrations.forEach(reg => {
        const coachData = reg.coach;
        if (!coachData) return;
        
        const coachId = coachData.id;
        if (!groupsMap.has(coachId)) {
          groupsMap.set(coachId, {
            coachId: coachId,
            coachName: coachData.full_name,
            coachEmail: coachData.email,
            organizationName: coachData.organization?.name || 'غير محدد',
            players: []
          });
        }
        
        groupsMap.get(coachId)!.players.push({
          id: reg.player_id,
          name: reg.player_name,
          birth_date: reg.birth_date || '',
          belt_level: reg.last_belt || ''
        });
      });
      
      setRegistrationsGroups(Array.from(groupsMap.values()));
      setExpandedCoaches(new Set());
    } catch (error) {
      console.error('Error loading registrations:', error);
      alert('حدث خطأ أثناء تحميل البيانات');
      setRegistrationsGroups([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id: string, table: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await loadData();
      alert('تم الحذف بنجاح');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const toggleCoachExpand = (coachId: string) => {
    setExpandedCoaches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(coachId)) {
        newSet.delete(coachId);
      } else {
        newSet.add(coachId);
      }
      return newSet;
    });
  };

  const filteredCoachGroups = registrationsGroups.filter(group =>
    group.coachName?.toLowerCase().includes(searchCoachTerm.toLowerCase()) ||
    group.organizationName?.toLowerCase().includes(searchCoachTerm.toLowerCase()) ||
    (group.coachEmail && group.coachEmail.toLowerCase().includes(searchCoachTerm.toLowerCase()))
  );

  const handlePeriodTypeChange = (type: 'exam' | 'secondary' | 'championship') => {
    setSelectedPeriodType(type);
    setSelectedPeriodId('');
    setRegistrationsGroups([]);
    setPeriodsForDropdown([]);
  };

  const handlePeriodSelect = (periodId: string) => {
    setSelectedPeriodId(periodId);
  };

  const exportToExcel = () => {
    if (registrationsGroups.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    setExportLoading(true);
    try {
      // Prepare data for export
      const exportData: any[] = [];
      
      registrationsGroups.forEach(group => {
        group.players.forEach(player => {
          exportData.push({
            'المدرب': group.coachName,
            'البريد الإلكتروني': group.coachEmail || '',
            'المؤسسة': group.organizationName,
            'اللاعب': player.name,
            'تاريخ الميلاد': player.birth_date ? new Date(player.birth_date).toLocaleDateString('ar-EG') : '',
            'الحزام': player.belt_level
          });
        });
      });

      // Create CSV
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          }).join(',')
        )
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `registrations_${selectedPeriodType}_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExportLoading(false);
    }
  };

  const getPeriodName = () => {
    const period = periodsForDropdown.find(p => p.id === selectedPeriodId);
    return period ? period.name : '';
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم الإدارة
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                نظام إدارة الكاراتيه - منطقة الإسكندرية
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="border-b overflow-x-auto">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('organizations')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'organizations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>النوادي والمراكز</span>
              </button>
              <button
                onClick={() => setActiveTab('coaches')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'coaches'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>المدربين</span>
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'players'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span>اللاعبين</span>
              </button>
              <button
                onClick={() => setActiveTab('examPeriods')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'examPeriods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>فترات الاختبارات</span>
              </button>
              <button
                onClick={() => setActiveTab('secondaryPeriods')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'secondaryPeriods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>التسجيل الثانوي</span>
              </button>
              <button
                onClick={() => setActiveTab('championshipPeriods')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'championshipPeriods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>البطولات</span>
              </button>
              <button
                onClick={() => setActiveTab('viewRegistrations')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === 'viewRegistrations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-5 h-5" />
                <span>عرض المسجلين</span>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab !== 'viewRegistrations' && (
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeTab === 'organizations' && 'النوادي ومراكز الشباب'}
                  {activeTab === 'coaches' && 'المدربين'}
                  {activeTab === 'players' && 'اللاعبين'}
                  {activeTab === 'examPeriods' && 'فترات الاختبارات'}
                  {activeTab === 'secondaryPeriods' && 'فترات التسجيل الثانوي'}
                  {activeTab === 'championshipPeriods' && 'فترات البطولات'}
                </h2>
                {(activeTab === 'organizations' || activeTab === 'coaches' || activeTab === 'players' || 
                  activeTab === 'examPeriods' || activeTab === 'secondaryPeriods' || activeTab === 'championshipPeriods') && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة جديد</span>
                  </button>
                )}
              </div>
            )}

            {loading && activeTab !== 'viewRegistrations' ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === 'organizations' && (
                  <OrganizationsTable
                    organizations={organizations}
                    onDelete={(id) => handleDelete(id, 'organizations')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'coaches' && (
                  <CoachesTable
                    coaches={coaches}
                    onDelete={(id) => handleDelete(id, 'profiles')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'players' && (
                  <PlayersTable
                    players={players}
                    onDelete={(id) => handleDelete(id, 'players')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'examPeriods' && (
                  <PeriodsTable
                    periods={examPeriods}
                    onDelete={(id) => handleDelete(id, 'exam_periods')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'secondaryPeriods' && (
                  <PeriodsTable
                    periods={secondaryPeriods}
                    onDelete={(id) => handleDelete(id, 'secondary_registration_periods')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'championshipPeriods' && (
                  <PeriodsTable
                    periods={championshipPeriods}
                    onDelete={(id) => handleDelete(id, 'tournament_periods')}
                    onEdit={(id) => {
                      setEditingId(id);
                      setShowModal(true);
                    }}
                  />
                )}
                {activeTab === 'viewRegistrations' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">نوع التسجيل</label>
                        <select
                          value={selectedPeriodType}
                          onChange={(e) => handlePeriodTypeChange(e.target.value as any)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="exam">اختبارات</option>
                          <option value="secondary">تسجيل ثانوي</option>
                          <option value="championship">بطولات</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">اختر الفترة</label>
                        <select
                          value={selectedPeriodId}
                          onChange={(e) => handlePeriodSelect(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">اختر فترة</option>
                          {periodsForDropdown.map(period => (
                            <option key={period.id} value={period.id}>
                              {period.name} ({new Date(period.start_date).toLocaleDateString('ar-EG')} - {new Date(period.end_date).toLocaleDateString('ar-EG')})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={loadRegistrations}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>عرض</span>
                      </button>
                      {registrationsGroups.length > 0 && (
                        <button
                          onClick={exportToExcel}
                          disabled={exportLoading}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
                        >
                          {exportLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span>تصدير</span>
                        </button>
                      )}
                    </div>

                    {selectedPeriodId && periodsForDropdown.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>الفترة المحددة:</strong> {getPeriodName()}
                        </p>
                      </div>
                    )}

                    {viewLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : registrationsGroups.length > 0 ? (
                      <>
                        <div className="mb-4">
                          <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              placeholder="ابحث باسم المدرب أو المؤسسة أو البريد الإلكتروني..."
                              value={searchCoachTerm}
                              onChange={(e) => setSearchCoachTerm(e.target.value)}
                              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          {filteredCoachGroups.map(group => (
                            <div key={group.coachId} className="border rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleCoachExpand(group.coachId)}
                                className="w-full bg-gray-50 p-4 flex justify-between items-center hover:bg-gray-100 transition"
                              >
                                <div className="text-right">
                                  <div className="font-semibold text-lg">{group.coachName}</div>
                                  <div className="text-sm text-gray-600">{group.organizationName}</div>
                                  {group.coachEmail && (
                                    <div className="text-sm text-gray-500">{group.coachEmail}</div>
                                  )}
                                  <div className="text-sm text-blue-600 mt-1">عدد اللاعبين: {group.players.length}</div>
                                </div>
                                {expandedCoaches.has(group.coachId) ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </button>
                              
                              {expandedCoaches.has(group.coachId) && (
                                <div className="p-4 overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b bg-gray-50">
                                        <th className="px-4 py-2 text-right text-sm font-semibold">اللاعب</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold">تاريخ الميلاد</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold">الحزام</th>
                                       </tr>
                                    </thead>
                                    <tbody>
                                      {group.players.map(player => (
                                        <tr key={player.id} className="border-b">
                                          <td className="px-4 py-2 text-sm">{player.name}</td>
                                          <td className="px-4 py-2 text-sm">{player.birth_date ? new Date(player.birth_date).toLocaleDateString('ar-EG') : '-'}</td>
                                          <td className="px-4 py-2 text-sm">{player.belt_level}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {filteredCoachGroups.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                              لا توجد نتائج مطابقة للبحث
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        {selectedPeriodId ? (
                          <div className="space-y-2">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto" />
                            <p>لا يوجد لاعبين مسجلين في هذه الفترة</p>
                            <p className="text-sm">يمكن للمدربين تسجيل لاعبيهم من خلال لوحة التحكم الخاصة بهم</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Eye className="w-16 h-16 text-gray-300 mx-auto" />
                            <p>الرجاء اختيار فترة لعرض المسجلين</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <FormModal
          type={activeTab}
          editingId={editingId}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function OrganizationsTable({
  organizations,
  onDelete,
  onEdit,
}: {
  organizations: Organization[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">النوع</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الإضافة</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {organizations.map((org) => (
          <tr key={org.id} className="border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-sm text-gray-900">{org.name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {org.type === 'club' ? 'نادي' : 'مركز شباب'}
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {org.created_at ? new Date(org.created_at).toLocaleDateString('ar-EG') : '-'}
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(org.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(org.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CoachesTable({
  coaches,
  onDelete,
  onEdit,
}: {
  coaches: Coach[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">البريد الإلكتروني</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المؤسسة</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ التسجيل</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {coaches.map((coach) => (
          <tr key={coach.id} className="border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-sm text-gray-900">{coach.full_name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{coach.email}</td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {coach.organization?.name}
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {coach.created_at ? new Date(coach.created_at).toLocaleDateString('ar-EG') : '-'}
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(coach.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(coach.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlayersTable({
  players,
  onDelete,
  onEdit,
}: {
  players: Player[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">المدرب</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">مستوى الحزام</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الهاتف</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الميلاد</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr key={player.id} className="border-b hover:bg-gray-50">
            <td className="px-6 py-4 text-sm text-gray-900">{player.full_name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{player.coach?.full_name}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{player.belt}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{player.phone || '-'}</td>
            <td className="px-6 py-4 text-sm text-gray-600">
              {player.birth_date ? new Date(player.birth_date).toLocaleDateString('ar-EG') : '-'}
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(player.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(player.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeriodsTable({
  periods,
  onDelete,
  onEdit,
}: {
  periods: any[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الاسم</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ البدء</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الانتهاء</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الحالة</th>
          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((period) => {
          const today = new Date();
          const startDate = new Date(period.start_date);
          const endDate = new Date(period.end_date);
          let status = '';
          let statusColor = '';
          
          if (today < startDate) {
            status = 'قادمة';
            statusColor = 'text-yellow-600 bg-yellow-50';
          } else if (today > endDate) {
            status = 'منتهية';
            statusColor = 'text-gray-600 bg-gray-50';
          } else {
            status = 'فعالة';
            statusColor = 'text-green-600 bg-green-50';
          }
          
          return (
            <tr key={period.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{period.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {new Date(period.start_date).toLocaleDateString('ar-EG')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {new Date(period.end_date).toLocaleDateString('ar-EG')}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                  {status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(period.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(period.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function FormModal({
  type,
  editingId,
  onClose,
  onSuccess,
}: {
  type: TabType;
  editingId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type === 'coaches') {
      loadOrganizations();
    } else if (type === 'players') {
      loadCoaches();
    }

    if (editingId) {
      loadExistingData();
    }
  }, [type, editingId]);

  const loadOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*').order('name');
    setOrganizations(data || []);
  };

  const loadCoaches = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'coach').order('full_name');
    setCoaches(data || []);
  };

  const loadExistingData = async () => {
    let table = '';
    if (type === 'organizations') table = 'organizations';
    else if (type === 'coaches') table = 'profiles';
    else if (type === 'players') table = 'players';
    else if (type === 'examPeriods') table = 'exam_periods';
    else if (type === 'secondaryPeriods') table = 'secondary_registration_periods';
    else if (type === 'championshipPeriods') table = 'tournament_periods';
    else return;

    const { data } = await supabase.from(table).select('*').eq('id', editingId).maybeSingle();
    if (data) {
      setFormData(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'organizations') {
        await saveOrganization();
      } else if (type === 'coaches') {
        await saveCoach();
      } else if (type === 'players') {
        await savePlayer();
      } else if (type === 'examPeriods') {
        await savePeriod('exam_periods');
      } else if (type === 'secondaryPeriods') {
        await savePeriod('secondary_registration_periods');
      } else if (type === 'championshipPeriods') {
        await savePeriod('tournament_periods');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const saveOrganization = async () => {
    const data = {
      name: formData.name,
      type: formData.type,
    };

    if (editingId) {
      const { error } = await supabase.from('organizations').update(data).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('organizations').insert([data]);
      if (error) throw error;
    }
  };

  const saveCoach = async () => {
    if (!editingId) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل إنشاء المستخدم');

      const { error } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        full_name: formData.full_name,
        role: 'coach',
        organization_id: formData.organization_id,
      }]);
      
      if (error) throw error;
    } else {
      const { error } = await supabase.from('profiles').update({
        organization_id: formData.organization_id,
        full_name: formData.full_name,
      }).eq('id', editingId);
      
      if (error) throw error;
    }
  };

  const savePlayer = async () => {
    const data = {
      coach_id: formData.coach_id,
      full_name: formData.full_name,
      birth_date: formData.birth_date,
      belt: formData.belt,
      phone: formData.phone,
      file_number: formData.file_number ? parseInt(formData.file_number) : null,
    };

    if (editingId) {
      const { error } = await supabase.from('players').update(data).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('players').insert([data]);
      if (error) throw error;
    }
  };

  const savePeriod = async (table: string) => {
    const data = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
    };

    if (editingId) {
      const { error } = await supabase.from(table).update(data).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(table).insert([data]);
      if (error) throw error;
    }
  };

  const renderFormFields = () => {
    if (type === 'organizations') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">النوع</label>
            <select
              required
              value={formData.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر النوع</option>
              <option value="club">نادي</option>
              <option value="youth_center">مركز شباب</option>
            </select>
          </div>
        </>
      );
    }

    if (type === 'coaches') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
            <input
              type="text"
              required
              value={formData.full_name || ''}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المؤسسة</label>
            <select
              required
              value={formData.organization_id || ''}
              onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر المؤسسة</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          {!editingId && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </>
      );
    }

    if (type === 'players') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
            <input
              type="text"
              required
              value={formData.full_name || ''}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">المدرب</label>
            <select
              required
              value={formData.coach_id || ''}
              onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر المدرب</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الرقم</label>
            <input
              type="text"
              value={formData.file_number || ''}
              onChange={(e) => setFormData({ ...formData, file_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الميلاد</label>
            <input
              type="date"
              value={formData.birth_date || ''}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">مستوى الحزام</label>
            <select
              value={formData.belt || 'white'}
              onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="white">أبيض</option>
              <option value="yellow">أصفر</option>
              <option value="orange">برتقالي</option>
              <option value="green">أخضر</option>
              <option value="blue">أزرق</option>
              <option value="brown">بني</option>
              <option value="black">أسود</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </>
      );
    }

    if (type === 'examPeriods' || type === 'secondaryPeriods' || type === 'championshipPeriods') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البدء</label>
            <input
              type="date"
              required
              value={formData.start_date || ''}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء</label>
            <input
              type="date"
              required
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? 'تعديل' : 'إضافة جديد'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {renderFormFields()}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
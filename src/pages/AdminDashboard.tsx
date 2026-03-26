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
  Download
} from 'lucide-react';

type TabType = 'organizations' | 'coaches' | 'players' | 'examPeriods' | 'secondaryPeriods' | 'championshipPeriods';
type PeriodTabType = 'exam' | 'secondary' | 'championship';

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

interface Registration {
  id: string;
  player_name: string;
  birth_date: string | null;
  last_belt: string | null;
  player?: {
    id: string;
    full_name: string;
    birth_date: string | null;
    belt: string | null;
  };
  coach?: {
    id: string;
    full_name: string;
    email?: string;
    organization_id: string;
    organization?: {
      id: string;
      name: string;
    };
  };
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
  const [selectedPeriodType, setSelectedPeriodType] = useState<PeriodTabType>('exam');
  const [registrationsView, setRegistrationsView] = useState<{
    type: PeriodTabType;
    periodId: string;
    periodName: string;
    registrations: Registration[];
  } | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<{
    id: string;
    type: PeriodTabType;
    name: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

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
          .order('start_date', { ascending: false });
        if (error) throw error;
        setExamPeriods(data || []);
      } else if (activeTab === 'secondaryPeriods') {
        const { data, error } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .order('start_date', { ascending: false });
        if (error) throw error;
        setSecondaryPeriods(data || []);
      } else if (activeTab === 'championshipPeriods') {
        const { data, error } = await supabase
          .from('tournament_periods')
          .select('*')
          .order('start_date', { ascending: false });
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

  const handleDeletePeriod = async (id: string, type: PeriodTabType) => {
    let table = '';
    if (type === 'exam') table = 'exam_periods';
    else if (type === 'secondary') table = 'secondary_registration_periods';
    else table = 'tournament_periods';

    await handleDelete(id, table);
  };

  const handleEditPeriod = (period: any, type: PeriodTabType) => {
    setEditingPeriod({
      id: period.id,
      type: type,
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
    });
    setSelectedPeriodType(type);
    setEditingId(period.id);
    setShowModal(true);
  };

  const viewRegistrations = async (type: PeriodTabType, periodId: string, periodName: string) => {
    setLoading(true);
    let registrations: Registration[] = [];

    try {
      if (type === 'exam') {
        const { data, error } = await supabase
          .from('exam_registrations')
          .select(`
            *,
            player:players(*),
            coach:profiles!exam_registrations_coach_id_fkey(
              *,
              organization:organizations(*)
            )
          `)
          .eq('exam_period_id', periodId);
        
        if (error) throw error;
        registrations = data || [];
      } else if (type === 'secondary') {
        const { data, error } = await supabase
          .from('secondary_registrations')
          .select(`
            *,
            player:players(*),
            coach:profiles!secondary_registrations_coach_id_fkey(
              *,
              organization:organizations(*)
            )
          `)
          .eq('secondary_period_id', periodId);
        
        if (error) throw error;
        registrations = data || [];
      } else {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select(`
            *,
            player:players(*),
            coach:profiles!tournament_registrations_coach_id_fkey(
              *,
              organization:organizations(*)
            )
          `)
          .eq('tournament_period_id', periodId);
        
        if (error) throw error;
        registrations = data || [];
      }

      setRegistrationsView({ type, periodId, periodName, registrations });
    } catch (error) {
      console.error('Error loading registrations:', error);
      alert('حدث خطأ أثناء تحميل المسجلين');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodStatus = (startDate: string, endDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (today < startDate) return { text: 'قادم', className: 'bg-yellow-100 text-yellow-800' };
    if (today > endDate) return { text: 'منتهي', className: 'bg-gray-100 text-gray-800' };
    return { text: 'نشط', className: 'bg-green-100 text-green-800' };
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
            </nav>
          </div>

          <div className="p-6">
            {/* Basic Tables for Organizations, Coaches, Players */}
            {(activeTab === 'organizations' || activeTab === 'coaches' || activeTab === 'players') && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {activeTab === 'organizations' && 'النوادي ومراكز الشباب'}
                    {activeTab === 'coaches' && 'المدربين'}
                    {activeTab === 'players' && 'اللاعبين'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingPeriod(null);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة جديد</span>
                  </button>
                </div>

                {loading ? (
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
                  </div>
                )}
              </>
            )}

            {/* Period Management Tabs */}
            {(activeTab === 'examPeriods' || activeTab === 'secondaryPeriods' || activeTab === 'championshipPeriods') && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {activeTab === 'examPeriods' && 'إدارة فترات الاختبارات'}
                    {activeTab === 'secondaryPeriods' && 'إدارة فترات التسجيل الثانوي'}
                    {activeTab === 'championshipPeriods' && 'إدارة فترات البطولات'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingPeriod(null);
                      setSelectedPeriodType(
                        activeTab === 'examPeriods' ? 'exam' : 
                        activeTab === 'secondaryPeriods' ? 'secondary' : 'championship'
                      );
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة فترة جديدة</span>
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTab === 'examPeriods' && (
                      <PeriodsTable
                        periods={examPeriods}
                        type="exam"
                        onDelete={(id) => handleDeletePeriod(id, 'exam')}
                        onEdit={(period) => handleEditPeriod(period, 'exam')}
                        onViewRegistrations={(id, name) => viewRegistrations('exam', id, name)}
                        getPeriodStatus={getPeriodStatus}
                      />
                    )}
                    {activeTab === 'secondaryPeriods' && (
                      <PeriodsTable
                        periods={secondaryPeriods}
                        type="secondary"
                        onDelete={(id) => handleDeletePeriod(id, 'secondary')}
                        onEdit={(period) => handleEditPeriod(period, 'secondary')}
                        onViewRegistrations={(id, name) => viewRegistrations('secondary', id, name)}
                        getPeriodStatus={getPeriodStatus}
                      />
                    )}
                    {activeTab === 'championshipPeriods' && (
                      <PeriodsTable
                        periods={championshipPeriods}
                        type="championship"
                        onDelete={(id) => handleDeletePeriod(id, 'championship')}
                        onEdit={(period) => handleEditPeriod(period, 'championship')}
                        onViewRegistrations={(id, name) => viewRegistrations('championship', id, name)}
                        getPeriodStatus={getPeriodStatus}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Registrations View Modal */}
      {registrationsView && (
        <RegistrationsModal
          registrations={registrationsView.registrations}
          periodName={registrationsView.periodName}
          periodType={registrationsView.type}
          onClose={() => setRegistrationsView(null)}
        />
      )}

      {/* Form Modal */}
      {showModal && (
        <FormModal
          type={activeTab === 'organizations' ? 'organizations' : activeTab === 'coaches' ? 'coaches' : activeTab === 'players' ? 'players' : 'period'}
          periodType={selectedPeriodType}
          editingId={editingId}
          editingPeriod={editingPeriod}
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
            setEditingPeriod(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingId(null);
            setEditingPeriod(null);
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
  type,
  onDelete,
  onEdit,
  onViewRegistrations,
  getPeriodStatus,
}: {
  periods: any[];
  type: string;
  onDelete: (id: string) => void;
  onEdit: (period: any) => void;
  onViewRegistrations: (id: string, name: string) => void;
  getPeriodStatus: (start: string, end: string) => { text: string; className: string };
}) {
  const typeLabels = {
    exam: { name: 'الاختبارات', period: 'فترة اختبار' },
    secondary: { name: 'التسجيل الثانوي', period: 'فترة تسجيل ثانوي' },
    championship: { name: 'البطولات', period: 'فترة بطولة' },
  };

  const label = typeLabels[type as keyof typeof typeLabels] || { name: '', period: '' };

  return (
    <div className="space-y-3">
      {periods.map((period) => {
        const status = getPeriodStatus(period.start_date, period.end_date);
        return (
          <div key={period.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{period.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                    {status.text}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>من: {new Date(period.start_date).toLocaleDateString('ar-EG')}</span>
                  <span>إلى: {new Date(period.end_date).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onViewRegistrations(period.id, period.name)}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">عرض المسجلين</span>
                </button>
                <button
                  onClick={() => onEdit(period)}
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
            </div>
          </div>
        );
      })}
      {periods.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          لا توجد {label.name} حالياً
        </div>
      )}
    </div>
  );
}

function RegistrationsModal({
  registrations,
  periodName,
  periodType,
  onClose,
}: {
  registrations: any[];
  periodName: string;
  periodType: PeriodTabType;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Group registrations by coach
  const groupedByCoach: Record<string, any[]> = registrations.reduce((acc: Record<string, any[]>, reg: any) => {
    const coachName = reg.coach?.full_name || 'مدرب غير معروف';
    if (!acc[coachName]) acc[coachName] = [];
    acc[coachName].push(reg);
    return acc;
  }, {});

  // Filter coaches based on search term
  const filteredCoaches = Object.entries(groupedByCoach).filter(([coachName]) => {
    if (!searchTerm.trim()) return true;
    return coachName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const exportToExcel = () => {
    if (registrations.length === 0) return;

    try {
      const exportData: any[] = [];
      
      registrations.forEach(reg => {
        exportData.push({
          'المدرب': reg.coach?.full_name || 'غير معروف',
          'المؤسسة': reg.coach?.organization?.name || 'غير معروف',
          'اللاعب': reg.player?.full_name || reg.player_name,
          'تاريخ الميلاد': reg.birth_date || reg.player?.birth_date || '',
          'الحزام': reg.last_belt || reg.player?.belt || ''
        });
      });

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
      const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${periodType}_${periodName}_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('حدث خطأ أثناء التصدير');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            المسجلين في {periodName}
          </h3>
          <div className="flex gap-2">
            {registrations.length > 0 && (
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">تصدير</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن مدرب بالاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Coaches List */}
          <div className="space-y-6">
            {filteredCoaches.map(([coachName, coachRegistrations]) => {
              const organizationName = coachRegistrations[0]?.coach?.organization?.name || 'لا يوجد';
              
              return (
                <div key={coachName} className="border rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">المدرب: {coachName}</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          <Building2 className="w-4 h-4 inline ml-1" />
                          {organizationName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full inline-block">
                        عدد اللاعبين: {coachRegistrations.length}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">اللاعب</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">تاريخ الميلاد</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">الحزام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coachRegistrations.map((reg: any) => (
                          <tr key={reg.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{reg.player?.full_name || reg.player_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {reg.birth_date || reg.player?.birth_date 
                                ? new Date(reg.birth_date || reg.player?.birth_date).toLocaleDateString('ar-EG') 
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{reg.last_belt || reg.player?.belt || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {filteredCoaches.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'لا يوجد مدربين مطابقين للبحث' : 'لا يوجد مسجلين في هذه الفترة'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormModal({
  type,
  periodType,
  editingId,
  editingPeriod,
  onClose,
  onSuccess,
}: {
  type: string;
  periodType?: 'exam' | 'secondary' | 'championship';
  editingId: string | null;
  editingPeriod: {
    id: string;
    type: PeriodTabType;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
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

    if (editingId && type !== 'period') {
      loadExistingData();
    } else if (editingPeriod && type === 'period') {
      setFormData({
        name: editingPeriod.name,
        start_date: editingPeriod.start_date,
        end_date: editingPeriod.end_date,
      });
    }
  }, [type, editingId, editingPeriod]);

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

    if (table) {
      const { data } = await supabase.from(table).select('*').eq('id', editingId).maybeSingle();
      if (data) {
        setFormData(data);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'period' && periodType) {
        await savePeriod();
      } else if (type === 'organizations') {
        await saveOrganization();
      } else if (type === 'coaches') {
        await saveCoach();
      } else if (type === 'players') {
        await savePlayer();
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const savePeriod = async () => {
    let table = '';
    if (periodType === 'exam') table = 'exam_periods';
    else if (periodType === 'secondary') table = 'secondary_registration_periods';
    else table = 'tournament_periods';

    const data = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
    };

    const periodId = editingPeriod?.id || editingId;
    
    if (periodId) {
      const { error } = await supabase.from(table).update(data).eq('id', periodId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(table).insert([data]);
      if (error) throw error;
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
        full_name: formData.full_name,
        organization_id: formData.organization_id,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId || editingPeriod ? 'تعديل' : 'إضافة جديد'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Period Form */}
          {type === 'period' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ البدء
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الانتهاء
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Organization Form */}
          {type === 'organizations' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  النوع
                </label>
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
          )}

          {/* Coach Form */}
          {type === 'coaches' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المؤسسة
                </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كلمة المرور
                    </label>
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
          )}

          {/* Player Form */}
          {type === 'players' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المدرب
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرقم
                </label>
                <input
                  type="text"
                  value={formData.file_number || ''}
                  onChange={(e) => setFormData({ ...formData, file_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ الميلاد
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مستوى الحزام
                </label>
                <select
                  required
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

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
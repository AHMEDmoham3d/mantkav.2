import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach } from '../lib/supabase';
import { LogOut, Search, UserCircle, Calendar, Trophy, BookOpen, Loader2, XCircle, FileText, Printer } from 'lucide-react';

interface ExtendedPlayer extends Player {
  examRegistered?: boolean;
  secondaryRegistered?: boolean;
  championshipRegistered?: boolean;
}

interface ExamPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface SecondaryPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface ChampionshipPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface RegisteredPlayer {
  id: string;
  full_name: string;
  birth_date: string | null;
  belt: string | null;
  phone: string | null;
  file_number: number | null;
  registration_date: string;
}

export default function CoachDashboard() {
  const { signOut, user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<ExtendedPlayer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [registeringPlayer, setRegisteringPlayer] = useState<string | null>(null);
  const [registeringType, setRegisteringType] = useState<'exam' | 'secondary' | 'championship' | null>(null);
  const [cancellingPlayer, setCancellingPlayer] = useState<string | null>(null);
  const [cancellingType, setCancellingType] = useState<'exam' | 'secondary' | 'championship' | null>(null);
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'exam' | 'secondary' | 'championship' | null>(null);
  const [reportPlayers, setReportPlayers] = useState<RegisteredPlayer[]>([]);
  const [reportPeriodName, setReportPeriodName] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Active periods
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);
  const [activeSecondary, setActiveSecondary] = useState<SecondaryPeriod | null>(null);
  const [activeChampionship, setActiveChampionship] = useState<ChampionshipPeriod | null>(null);

  useEffect(() => {
    if (user) {
      loadCoachData();
    }
  }, [user]);

  useEffect(() => {
    filterPlayers();
  }, [searchTerm, players]);

  const loadCoachData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get coach profile
      const { data: coachData } = await supabase
        .from('profiles')
        .select('*, organization:organizations(*)')
        .eq('id', user.id)
        .eq('role', 'coach')
        .maybeSingle();

      if (coachData) {
        setCoach(coachData);

        // Get players for this coach
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('coach_id', coachData.id)
          .order('full_name');

        const playersList: ExtendedPlayer[] = (playersData || []).map(p => ({ 
          ...p, 
          examRegistered: false, 
          secondaryRegistered: false, 
          championshipRegistered: false 
        }));
        
        const today = new Date().toISOString().split('T')[0];

        // Check for active exam period
        const { data: activeExamData } = await supabase
          .from('exam_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();
        
        setActiveExam(activeExamData || null);

        // Check for active secondary registration period
        const { data: activeSecondaryData } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();
        
        setActiveSecondary(activeSecondaryData || null);

        // Check for active championship period
        const { data: activeChampData } = await supabase
          .from('tournament_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle();
        
        setActiveChampionship(activeChampData || null);

        // Load existing registrations and update playersList
        if (activeExamData) {
          const { data: examRegs } = await supabase
            .from('exam_registrations')
            .select('player_id')
            .eq('exam_period_id', activeExamData.id)
            .eq('coach_id', coachData.id);
          
          const examSet = new Set(examRegs?.map((r: { player_id: string }) => r.player_id) || []);
          playersList.forEach(p => p.examRegistered = examSet.has(p.id));
        }

        if (activeSecondaryData) {
          const { data: secondaryRegs } = await supabase
            .from('secondary_registrations')
            .select('player_id')
            .eq('secondary_period_id', activeSecondaryData.id)
            .eq('coach_id', coachData.id);
          
          const secondarySet = new Set(secondaryRegs?.map((r: { player_id: string }) => r.player_id) || []);
          playersList.forEach(p => p.secondaryRegistered = secondarySet.has(p.id));
        }

        if (activeChampData) {
          const { data: champRegs } = await supabase
            .from('tournament_registrations')
            .select('player_id')
            .eq('tournament_period_id', activeChampData.id)
            .eq('coach_id', coachData.id);
          
          const champSet = new Set(champRegs?.map((r: { player_id: string }) => r.player_id) || []);
          playersList.forEach(p => p.championshipRegistered = champSet.has(p.id));
        }

        setPlayers(playersList);
        setFilteredPlayers(playersList);
      }
    } catch (error) {
      console.error('Error loading coach data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = players.filter(
      (player) =>
        player.full_name.toLowerCase().includes(term) ||
        (player.belt && player.belt.toLowerCase().includes(term)) ||
        (player.file_number && player.file_number.toString().includes(term))
    );
    setFilteredPlayers(filtered);
  };

  const handleRegister = async (playerId: string, type: 'exam' | 'secondary' | 'championship') => {
    if (!coach || !playerId) return;

    setRegisteringPlayer(playerId);
    setRegisteringType(type);

    try {
      const player = players.find(p => p.id === playerId);
      if (!player) throw new Error('Player not found');

      if (type === 'exam' && activeExam) {
        const { error } = await supabase
          .from('exam_registrations')
          .insert([{
            exam_period_id: activeExam.id,
            player_id: playerId,
            coach_id: coach.id,
            player_name: player.full_name,
            birth_date: player.birth_date,
            last_belt: player.belt || 'أبيض - 12',
          }]);

        if (error) throw error;
        
        setPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, examRegistered: true } : p
        ));
        setFilteredPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, examRegistered: true } : p
        ));
        alert('تم تسجيل اللاعب في الاختبار بنجاح');

      } else if (type === 'secondary' && activeSecondary) {
        const { error } = await supabase
          .from('secondary_registrations')
          .insert([{
            secondary_period_id: activeSecondary.id,
            player_id: playerId,
            coach_id: coach.id,
            player_name: player.full_name,
            birth_date: player.birth_date,
            last_belt: player.belt || 'أبيض - 12',
          }]);

        if (error) throw error;
        
        setPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, secondaryRegistered: true } : p
        ));
        setFilteredPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, secondaryRegistered: true } : p
        ));
        alert('تم تسجيل اللاعب في التسجيل الثانوي بنجاح');

      } else if (type === 'championship' && activeChampionship) {
        const { error } = await supabase
          .from('tournament_registrations')
          .insert([{
            tournament_period_id: activeChampionship.id,
            player_id: playerId,
            coach_id: coach.id,
            player_name: player.full_name,
            birth_date: player.birth_date,
            last_belt: player.belt || 'أبيض - 12',
          }]);

        if (error) throw error;
        
        setPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, championshipRegistered: true } : p
        ));
        setFilteredPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, championshipRegistered: true } : p
        ));
        alert('تم تسجيل اللاعب في البطولة بنجاح');
      }
    } catch (error) {
      console.error('Error registering player:', error);
      alert('حدث خطأ أثناء التسجيل');
    } finally {
      setRegisteringPlayer(null);
      setRegisteringType(null);
    }
  };

  const handleCancel = async (playerId: string, type: 'exam' | 'secondary' | 'championship') => {
    if (!coach || !playerId) return;
    
    if (!confirm(`هل أنت متأكد من إلغاء تسجيل هذا اللاعب؟`)) return;

    setCancellingPlayer(playerId);
    setCancellingType(type);

    try {
      if (type === 'exam' && activeExam) {
        const { error } = await supabase
          .from('exam_registrations')
          .delete()
          .eq('exam_period_id', activeExam.id)
          .eq('player_id', playerId)
          .eq('coach_id', coach.id);

        if (error) throw error;
        
        setPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, examRegistered: false } : p
        ));
        setFilteredPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, examRegistered: false } : p
        ));
        alert('تم إلغاء تسجيل اللاعب من الاختبار بنجاح');

      } else if (type === 'secondary' && activeSecondary) {
        const { error } = await supabase
          .from('secondary_registrations')
          .delete()
          .eq('secondary_period_id', activeSecondary.id)
          .eq('player_id', playerId)
          .eq('coach_id', coach.id);

        if (error) throw error;
        
        setPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, secondaryRegistered: false } : p
        ));
        setFilteredPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, secondaryRegistered: false } : p
        ));
        alert('تم إلغاء تسجيل اللاعب من التسجيل الثانوي بنجاح');

      } else if (type === 'championship' && activeChampionship) {
        const { error } = await supabase
          .from('tournament_registrations')
          .delete()
          .eq('tournament_period_id', activeChampionship.id)
          .eq('player_id', playerId)
          .eq('coach_id', coach.id);

        if (error) throw error;
        
        setPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, championshipRegistered: false } : p
        ));
        setFilteredPlayers((prev: ExtendedPlayer[]) => prev.map(p => 
          p.id === playerId ? { ...p, championshipRegistered: false } : p
        ));
        alert('تم إلغاء تسجيل اللاعب من البطولة بنجاح');
      }
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('حدث خطأ أثناء إلغاء التسجيل');
    } finally {
      setCancellingPlayer(null);
      setCancellingType(null);
    }
  };

  // New function to load registered players report
  const loadRegisteredPlayersReport = async (type: 'exam' | 'secondary' | 'championship') => {
    if (!coach) return;

    setLoadingReport(true);
    setReportType(type);
    
    try {
      let periodId = '';
      let periodName = '';
      let tableName = '';

      if (type === 'exam' && activeExam) {
        periodId = activeExam.id;
        periodName = activeExam.name;
        tableName = 'exam_registrations';
      } else if (type === 'secondary' && activeSecondary) {
        periodId = activeSecondary.id;
        periodName = activeSecondary.name;
        tableName = 'secondary_registrations';
      } else if (type === 'championship' && activeChampionship) {
        periodId = activeChampionship.id;
        periodName = activeChampionship.name;
        tableName = 'tournament_registrations';
      } else {
        alert('لا توجد فترة نشطة لهذا النوع');
        setLoadingReport(false);
        return;
      }

      // Fetch registered players with their details
      const { data: registrations, error } = await supabase
        .from(tableName)
        .select(`
          *,
          player:players(*)
        `)
        .eq(`${type === 'exam' ? 'exam_period_id' : type === 'secondary' ? 'secondary_period_id' : 'tournament_period_id'}`, periodId)
        .eq('coach_id', coach.id);

      if (error) throw error;

      const registeredPlayers: RegisteredPlayer[] = (registrations || []).map(reg => ({
        id: reg.player.id,
        full_name: reg.player.full_name,
        birth_date: reg.player.birth_date,
        belt: reg.player.belt,
        phone: reg.player.phone,
        file_number: reg.player.file_number,
        registration_date: reg.created_at ? new Date(reg.created_at).toLocaleDateString('ar-EG') : new Date().toLocaleDateString('ar-EG')
      }));

      setReportPlayers(registeredPlayers);
      setReportPeriodName(periodName);
      setShowReportModal(true);
    } catch (error) {
      console.error('Error loading report:', error);
      alert('حدث خطأ أثناء تحميل التقرير');
    } finally {
      setLoadingReport(false);
    }
  };

  const printReport = () => {
    const printContent = document.getElementById('report-content');
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `تقرير المسجلين - ${reportPeriodName}`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>تقرير المسجلين - ${reportPeriodName}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 20px;
                padding: 0;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
              }
              .header h1 {
                margin: 0;
                color: #1e3a8a;
              }
              .header h2 {
                margin: 10px 0 0;
                color: #4b5563;
              }
              .info {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f3f4f6;
                border-radius: 8px;
              }
              .info p {
                margin: 5px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: right;
              }
              th {
                background-color: #1e3a8a;
                color: white;
                font-weight: bold;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #ddd;
                padding-top: 20px;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 10px;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.outerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    
    document.title = originalTitle;
  };

  const getBeltColor = (belt: string | null) => {
    const beltLower = belt?.toLowerCase() || 'white';
    const colors: Record<string, string> = {
      'أبيض - 12': 'bg-gray-200 text-gray-800',
      'أصفر - 11': 'bg-yellow-200 text-yellow-800',
      'أصفر - 10': 'bg-yellow-200 text-yellow-800',
      'أصفر - 9': 'bg-yellow-200 text-yellow-800',
      'برتقالى - 8': 'bg-orange-200 text-orange-800',
      'برتقالى - 7': 'bg-orange-200 text-orange-800',
      'اخضر - 6': 'bg-green-200 text-green-800',
      'اخضر - 5': 'bg-green-200 text-green-800',
      'ازرق - 4': 'bg-blue-200 text-blue-800',
      'ازرق - 3': 'bg-blue-200 text-blue-800',
      'بني - 2': 'bg-amber-700 text-white',
      'بني - 1': 'bg-amber-700 text-white',
      'دان - 1': 'bg-gray-900 text-white',
      'دان - 2': 'bg-gray-900 text-white',
      'دان - 3': 'bg-gray-900 text-white',
      'دان - 4': 'bg-gray-900 text-white',
    };
    return colors[beltLower] || 'bg-gray-200 text-gray-800';
  };

  const getBeltName = (belt: string | null) => {
    if (!belt) return 'أبيض - 12';
    return belt;
  };

  const isRegistering = (playerId: string, type: 'exam' | 'secondary' | 'championship') => {
    return registeringPlayer === playerId && registeringType === type;
  };

  const isCancelling = (playerId: string, type: 'exam' | 'secondary' | 'championship') => {
    return cancellingPlayer === playerId && cancellingType === type;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم المدرب
              </h1>
              {coach && (
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-600">
                    المدرب: <span className="font-medium text-gray-900">{coach.full_name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    المؤسسة: <span className="font-medium text-gray-900">{coach.organization?.name}</span>
                  </p>
                </div>
              )}
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
        {/* Active Periods Cards with Report Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {activeExam && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-lg">فترة الاختبارات</h3>
                </div>
                <button
                  onClick={() => loadRegisteredPlayersReport('exam')}
                  disabled={loadingReport}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition text-sm"
                >
                  {loadingReport && reportType === 'exam' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>عرض الكشف</span>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-1">{activeExam.name}</p>
              <p className="text-xs text-gray-500">
                من {new Date(activeExam.start_date).toLocaleDateString('ar-EG')} 
                {' إلى '}
                {new Date(activeExam.end_date).toLocaleDateString('ar-EG')}
              </p>
            </div>
          )}
          
          {activeSecondary && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-lg">التسجيل الثانوي</h3>
                </div>
                <button
                  onClick={() => loadRegisteredPlayersReport('secondary')}
                  disabled={loadingReport}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition text-sm"
                >
                  {loadingReport && reportType === 'secondary' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>عرض الكشف</span>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-1">{activeSecondary.name}</p>
              <p className="text-xs text-gray-500">
                من {new Date(activeSecondary.start_date).toLocaleDateString('ar-EG')} 
                {' إلى '}
                {new Date(activeSecondary.end_date).toLocaleDateString('ar-EG')}
              </p>
            </div>
          )}
          
          {activeChampionship && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                  <h3 className="font-semibold text-lg">البطولة</h3>
                </div>
                <button
                  onClick={() => loadRegisteredPlayersReport('championship')}
                  disabled={loadingReport}
                  className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition text-sm"
                >
                  {loadingReport && reportType === 'championship' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>عرض الكشف</span>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-1">{activeChampionship.name}</p>
              <p className="text-xs text-gray-500">
                من {new Date(activeChampionship.start_date).toLocaleDateString('ar-EG')} 
                {' إلى '}
                {new Date(activeChampionship.end_date).toLocaleDateString('ar-EG')}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">اللاعبين</h2>
                <p className="text-sm text-gray-600 mt-1">
                  عدد اللاعبين: {filteredPlayers.length}
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن لاعب (الاسم، الحزام، الرقم)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm ? 'لم يتم العثور على نتائج' : 'لا يوجد لاعبين'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCircle className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{player.full_name}</h3>
                          {player.file_number && (
                            <p className="text-xs text-gray-500">رقم: {player.file_number}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">تاريخ الميلاد:</span>
                        <span className="text-sm text-gray-900">
                          {player.birth_date
                            ? new Date(player.birth_date).toLocaleDateString('ar-EG')
                            : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">الحزام:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getBeltColor(
                            player.belt
                          )}`}
                        >
                          {getBeltName(player.belt)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      {activeExam && (
                        <div className="flex gap-2">
                          {!player.examRegistered ? (
                            <button
                              onClick={() => handleRegister(player.id, 'exam')}
                              disabled={isRegistering(player.id, 'exam')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition disabled:opacity-50"
                            >
                              {isRegistering(player.id, 'exam') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Calendar className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">تسجيل اختبار</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancel(player.id, 'exam')}
                              disabled={isCancelling(player.id, 'exam')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition disabled:opacity-50"
                            >
                              {isCancelling(player.id, 'exam') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">إلغاء الاختبار</span>
                            </button>
                          )}
                        </div>
                      )}

                      {activeSecondary && (
                        <div className="flex gap-2">
                          {!player.secondaryRegistered ? (
                            <button
                              onClick={() => handleRegister(player.id, 'secondary')}
                              disabled={isRegistering(player.id, 'secondary')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition disabled:opacity-50"
                            >
                              {isRegistering(player.id, 'secondary') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <BookOpen className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">تسجيل ثانوي</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancel(player.id, 'secondary')}
                              disabled={isCancelling(player.id, 'secondary')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition disabled:opacity-50"
                            >
                              {isCancelling(player.id, 'secondary') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">إلغاء الثانوي</span>
                            </button>
                          )}
                        </div>
                      )}

                      {activeChampionship && (
                        <div className="flex gap-2">
                          {!player.championshipRegistered ? (
                            <button
                              onClick={() => handleRegister(player.id, 'championship')}
                              disabled={isRegistering(player.id, 'championship')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition disabled:opacity-50"
                            >
                              {isRegistering(player.id, 'championship') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trophy className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">تسجيل بطولة</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancel(player.id, 'championship')}
                              disabled={isCancelling(player.id, 'championship')}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition disabled:opacity-50"
                            >
                              {isCancelling(player.id, 'championship') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">إلغاء البطولة</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                كشف المسجلين - {reportPeriodName}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={printReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6" id="report-content">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-blue-800">نظام إدارة الكاراتيه</h1>
                <h2 className="text-xl font-semibold text-gray-700 mt-2">منطقة الإسكندرية</h2>
                <h3 className="text-lg font-medium text-gray-600 mt-1">كشف المسجلين في {reportPeriodName}</h3>
              </div>

              <div className="info mb-6 p-4 bg-gray-50 rounded-lg">
                <p><strong>المدرب:</strong> {coach?.full_name}</p>
                <p><strong>المؤسسة:</strong> {coach?.organization?.name}</p>
                <p><strong>تاريخ الكشف:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                <p><strong>عدد المسجلين:</strong> {reportPlayers.length} لاعب</p>
              </div>

              {reportPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">لا يوجد لاعبين مسجلين في هذه الفترة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-blue-800 text-white">
                        <th className="px-4 py-3 text-right">م</th>
                        <th className="px-4 py-3 text-right">الاسم</th>
                        <th className="px-4 py-3 text-right">الرقم</th>
                        <th className="px-4 py-3 text-right">تاريخ الميلاد</th>
                        <th className="px-4 py-3 text-right">الحزام</th>
                        <th className="px-4 py-3 text-right">رقم الهاتف</th>
                        <th className="px-4 py-3 text-right">تاريخ التسجيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportPlayers.map((player, index) => (
                        <tr key={player.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium">{player.full_name}</td>
                          <td className="px-4 py-3 text-sm">{player.file_number || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            {player.birth_date ? new Date(player.birth_date).toLocaleDateString('ar-EG') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${getBeltColor(player.belt)}`}>
                              {getBeltName(player.belt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{player.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm">{player.registration_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="footer mt-6 pt-4 text-center text-sm text-gray-500 border-t">
                <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الكاراتيه - منطقة الإسكندرية</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
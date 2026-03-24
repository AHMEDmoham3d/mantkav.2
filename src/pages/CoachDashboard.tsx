import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach } from '../lib/supabase';
import { LogOut, Search, UserCircle, Calendar, Trophy, BookOpen, CheckCircle, Loader2, XCircle } from 'lucide-react';

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
  
  // Active periods
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);
  const [activeSecondary, setActiveSecondary] = useState<SecondaryPeriod | null>(null);
  const [activeChampionship, setActiveChampionship] = useState<ChampionshipPeriod | null>(null);
  
  // Registration status
  const [examRegistrations, setExamRegistrations] = useState<Set<string>>(new Set());
  const [secondaryRegistrations, setSecondaryRegistrations] = useState<Set<string>>(new Set());
  const [championshipRegistrations, setChampionshipRegistrations] = useState<Set<string>>(new Set());

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

        // Load existing registrations
        if (activeExamData) {
          const { data: examRegs } = await supabase
            .from('exam_registrations')
            .select('player_id')
            .eq('exam_period_id', activeExamData.id)
            .eq('coach_id', coachData.id);
          
          const examSet = new Set(examRegs?.map(r => r.player_id) || []);
          setExamRegistrations(examSet);
          playersList.forEach(p => p.examRegistered = examSet.has(p.id));
        }

        if (activeSecondaryData) {
          const { data: secondaryRegs } = await supabase
            .from('secondary_registrations')
            .select('player_id')
            .eq('secondary_period_id', activeSecondaryData.id)
            .eq('coach_id', coachData.id);
          
          const secondarySet = new Set(secondaryRegs?.map(r => r.player_id) || []);
          setSecondaryRegistrations(secondarySet);
          playersList.forEach(p => p.secondaryRegistered = secondarySet.has(p.id));
        }

        if (activeChampData) {
          const { data: champRegs } = await supabase
            .from('tournament_registrations')
            .select('player_id')
            .eq('tournament_period_id', activeChampData.id)
            .eq('coach_id', coachData.id);
          
          const champSet = new Set(champRegs?.map(r => r.player_id) || []);
          setChampionshipRegistrations(champSet);
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
            last_belt: player.belt || 'white',
          }]);

        if (error) throw error;
        
        setExamRegistrations(prev => new Set([...prev, playerId]));
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, examRegistered: true } : p
        ));
        setFilteredPlayers(prev => prev.map(p => 
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
            last_belt: player.belt || 'white',
          }]);

        if (error) throw error;
        
        setSecondaryRegistrations(prev => new Set([...prev, playerId]));
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, secondaryRegistered: true } : p
        ));
        setFilteredPlayers(prev => prev.map(p => 
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
            last_belt: player.belt || 'white',
          }]);

        if (error) throw error;
        
        setChampionshipRegistrations(prev => new Set([...prev, playerId]));
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, championshipRegistered: true } : p
        ));
        setFilteredPlayers(prev => prev.map(p => 
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
        
        setExamRegistrations(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, examRegistered: false } : p
        ));
        setFilteredPlayers(prev => prev.map(p => 
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
        
        setSecondaryRegistrations(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, secondaryRegistered: false } : p
        ));
        setFilteredPlayers(prev => prev.map(p => 
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
        
        setChampionshipRegistrations(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, championshipRegistered: false } : p
        ));
        setFilteredPlayers(prev => prev.map(p => 
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

  const getBeltColor = (belt: string | null) => {
    const beltLower = belt?.toLowerCase() || 'white';
    const colors: Record<string, string> = {
      white: 'bg-gray-200 text-gray-800',
      yellow: 'bg-yellow-200 text-yellow-800',
      orange: 'bg-orange-200 text-orange-800',
      green: 'bg-green-200 text-green-800',
      blue: 'bg-blue-200 text-blue-800',
      brown: 'bg-amber-700 text-white',
      black: 'bg-gray-900 text-white',
    };
    return colors[beltLower] || 'bg-gray-200 text-gray-800';
  };

  const getBeltName = (belt: string | null) => {
    const beltLower = belt?.toLowerCase() || 'white';
    const names: Record<string, string> = {
      white: 'أبيض',
      yellow: 'أصفر',
      orange: 'برتقالي',
      green: 'أخضر',
      blue: 'أزرق',
      brown: 'بني',
      black: 'أسود',
    };
    return names[beltLower] || belt || 'أبيض';
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
        {/* Active Periods Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {activeExam && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-lg">فترة الاختبارات</h3>
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
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-lg">التسجيل الثانوي</h3>
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
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-6 h-6 text-yellow-600" />
                <h3 className="font-semibold text-lg">البطولة</h3>
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
    </div>
  );
}
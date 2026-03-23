import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Player, Coach, ExamRegistration, SecondaryRegistration, ChampionshipRegistration } from '../lib/supabase';
import type { ExamPeriod, SecondaryRegistrationPeriod, ChampionshipPeriod } from '../lib/supabase';

interface ExtendedPlayer extends Player {
  registered?: boolean;
  secondaryRegistered?: boolean;
  championshipRegistered?: boolean;
}
import { LogOut, Search, UserCircle, CheckCircle, XCircle, Download, Users, Trophy } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';

export default function CoachDashboard() {
const { signOut, user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<ExtendedPlayer[]>([]);
const [registeredPlayers, setRegisteredPlayers] = useState<ExamRegistration[]>([]);
const [secondaryRegisteredPlayers, setSecondaryRegisteredPlayers] = useState<SecondaryRegistration[]>([]);
const [championshipRegisteredPlayers, setChampionshipRegisteredPlayers] = useState<ChampionshipRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<ExamPeriod | null>(null);
  const [activeSecondaryRegistration, setActiveSecondaryRegistration] = useState<SecondaryRegistrationPeriod | null>(null);
  const [activeChampionship, setActiveChampionship] = useState<ChampionshipPeriod | null>(null);


  // Similar for other functions...







  useEffect(() => {
    const loadCoachData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data: coachData } = await supabase
          .from('profiles')
          .select('*, organization:organizations(*)')
          .eq('id', user.id)
          .single();

        setCoach(coachData || null);

        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('coach_id', user.id)
          .order('full_name');

        const playersList: ExtendedPlayer[] = (playersData || []) as ExtendedPlayer[];

        const today = new Date().toISOString().split('T')[0];

// Fixed fetches without limit
        const { data: activeExamData } = await supabase
          .from('exam_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today);
        const exam = activeExamData?.[0];
        setActiveExam(exam);

        const { data: activeSecondaryData } = await supabase
          .from('secondary_registration_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today);
        const secondary = activeSecondaryData?.[0];
        setActiveSecondaryRegistration(secondary);

        const { data: activeChampData } = await supabase
          .from('championship_periods')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today);
        const champ = activeChampData?.[0];
        setActiveChampionship(champ);

        // Registration checks - use first active or update for all
        if (activeExam && activeExam.id) {
          const { data: registrations } = await supabase
            .from('exam_registrations')
            .select('*')
            .eq('coach_id', user.id)
            .eq('exam_period_id', activeExam.id);

          setRegisteredPlayers(registrations || []);
          const registeredIds = registrations?.map(r => r.player_id) || [];
          playersList.forEach(player => {
            player.registered = registeredIds.includes(player.id);
          });
        }

        // Secondary registration
        if (activeSecondaryRegistration && activeSecondaryRegistration.id) {
          const { data: secondaryRegs } = await supabase
            .from('secondary_registrations')
            .select('*')
            .eq('coach_id', user.id)
            .eq('secondary_period_id', activeSecondaryRegistration.id);

          setSecondaryRegisteredPlayers(secondaryRegs || []);
          const secondaryIds = secondaryRegs?.map(r => r.player_id) || [];
          playersList.forEach(player => {
            player.secondaryRegistered = secondaryIds.includes(player.id);
          });
        }

        // Championship registration
        if (activeChampionship && activeChampionship.id) {
          const { data: champRegs } = await supabase
            .from('championship_registrations')
            .select('*')
            .eq('coach_id', user.id)
            .eq('championship_period_id', activeChampionship.id);

          setChampionshipRegisteredPlayers(champRegs || []);
          const champIds = champRegs?.map(r => r.player_id) || [];
          playersList.forEach(player => {
            player.championshipRegistered = champIds.includes(player.id);
          });
        }

        setPlayers(playersList);
        setFilteredPlayers(playersList);
      } catch (error) {
        console.error('Error loading coach data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCoachData();
  }, [user]);

  // Search and filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const filtered = players.filter(player =>
      player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.file_number?.includes(searchTerm)
    );
    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

  const downloadRegisteredPlayers = async () => {
    if (registeredPlayers.length === 0) {
      alert('لا يوجد لاعبون مسجلون');
      return;
    }

    const table = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('الاسم الكامل')], width: { size: 50, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('تاريخ الميلاد')], width: { size: 25, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph('الحزام')], width: { size: 25, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...registeredPlayers.map(reg => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(reg.player_name || '')] }),
            new TableCell({ children: [new Paragraph(reg.birth_date || '')] }),
            new TableCell({ children: [new Paragraph(reg.last_belt || '')] }),
          ],
        })),
      ],
    });

    const doc = new Document({
      sections: [{ children: [new Paragraph({ children: [new TextRun('كشف اللاعبين المسجلين')] }), table] }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registered_players_${new Date().toISOString().slice(0,10)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">جاري تحميل بيانات المدرب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <UserCircle className="w-12 h-12 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                لوحة تحكم المدرب {coach?.full_name}
              </h1>
              <p className="text-gray-600">{coach?.organization?.name}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن لاعب بالاسم أو الرقم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">إجمالي اللاعبين</h3>
            <p className="text-3xl font-bold text-blue-600">{players.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">مسجلون في الاختبار</h3>
            <p className="text-3xl font-bold text-green-600">{registeredPlayers.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">البطولات</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {championshipRegisteredPlayers.length} / {secondaryRegisteredPlayers.length}
            </p>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">قائمة اللاعبين</h2>
            {registeredPlayers.length > 0 && (
              <button
                onClick={downloadRegisteredPlayers}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                تحميل الكشف
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الاسم</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الرقم</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">العمر</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الحزام</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">الاختبار</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">التسجيل الثانوي</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">البطولة</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr key={player.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{player.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{player.file_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{player.age}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{player.belt}</td>
                    <td className="px-6 py-4">
                      {player.registered ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {player.secondaryRegistered ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {player.championshipRegistered ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      لا توجد لاعبين {searchTerm && 'مطابقة للبحث'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

# Coach Dashboard Restoration Plan

## Steps:
- [x] Step 1: Implement registerExam/registerSecondary/registerChampionship handlers in CoachDashboard.tsx (INSERT to exam_registrations/secondary_registrations/championship_registrations using player.full_name, birth_date, belt).
- [x] Step 2: Implement unregister handlers (DELETE WHERE period_id AND player_id).
- [x] Step 3: Add buttons in players table: for each active period, show Register/Unregister button per player.
- [x] Step 4: Extend downloadRegisteredPlayers to handle secondary/champ (add param or conditional).
- [x] Step 5: Add useCallback/refresh data after each action.
- [x] Step 6: Test: coach login, active periods, register/unreg, download, admin view unchanged.
- [x] Complete: attempt_completion.



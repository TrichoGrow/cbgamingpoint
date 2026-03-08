
-- Fix ALL RLS policies to be PERMISSIVE instead of RESTRICTIVE
-- Without at least one PERMISSIVE policy, PostgreSQL denies all access

-- ===== TOURNAMENTS =====
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;
CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert tournaments" ON public.tournaments;
CREATE POLICY "Admins can insert tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update tournaments" ON public.tournaments;
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== DEPOSIT_REQUESTS =====
DROP POLICY IF EXISTS "Users can create deposits" ON public.deposit_requests;
CREATE POLICY "Users can create deposits" ON public.deposit_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposit_requests;
CREATE POLICY "Users can view own deposits" ON public.deposit_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposit_requests;
CREATE POLICY "Admins can view all deposits" ON public.deposit_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update deposits" ON public.deposit_requests;
CREATE POLICY "Admins can update deposits" ON public.deposit_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== WITHDRAW_REQUESTS =====
DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdraw_requests;
CREATE POLICY "Users can create withdrawals" ON public.withdraw_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdraw_requests;
CREATE POLICY "Users can view own withdrawals" ON public.withdraw_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdraw_requests;
CREATE POLICY "Admins can view all withdrawals" ON public.withdraw_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.withdraw_requests;
CREATE POLICY "Admins can update withdrawals" ON public.withdraw_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== GAMES =====
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert games" ON public.games;
CREATE POLICY "Admins can insert games" ON public.games FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update games" ON public.games;
CREATE POLICY "Admins can update games" ON public.games FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete games" ON public.games;
CREATE POLICY "Admins can delete games" ON public.games FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== WALLET_TRANSACTIONS =====
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can insert transactions" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== PARTICIPANTS =====
DROP POLICY IF EXISTS "Users can join tournaments" ON public.participants;
CREATE POLICY "Users can join tournaments" ON public.participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own participations" ON public.participants;
CREATE POLICY "Users can view own participations" ON public.participants FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all participants" ON public.participants;
CREATE POLICY "Admins can view all participants" ON public.participants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update participants" ON public.participants;
CREATE POLICY "Admins can update participants" ON public.participants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete participants" ON public.participants;
CREATE POLICY "Admins can delete participants" ON public.participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== MATCH_RESULTS =====
DROP POLICY IF EXISTS "Anyone can view results" ON public.match_results;
CREATE POLICY "Anyone can view results" ON public.match_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert results" ON public.match_results;
CREATE POLICY "Admins can insert results" ON public.match_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update results" ON public.match_results;
CREATE POLICY "Admins can update results" ON public.match_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== ADMIN_LOGS =====
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
CREATE POLICY "Admins can view logs" ON public.admin_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;
CREATE POLICY "Admins can create logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== APP_SETTINGS =====
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

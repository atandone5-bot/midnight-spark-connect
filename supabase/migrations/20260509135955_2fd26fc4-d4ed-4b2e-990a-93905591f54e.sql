
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "messages react participant" ON public.messages;
CREATE POLICY "messages react participant"
  ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)));

CREATE OR REPLACE FUNCTION public.admin_grant_chats(_target uuid, _chats integer, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF _chats = 0 THEN RAISE EXCEPTION 'NO_OP'; END IF;
  UPDATE wallets SET chats_balance = GREATEST(0, chats_balance + _chats), updated_at = now()
    WHERE user_id = _target RETURNING chats_balance INTO v_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;
  INSERT INTO transactions (user_id, kind, chats_delta, amount_kes, status, reference, meta)
    VALUES (_target, 'topup', _chats, 0, 'success', 'admin_grant', jsonb_build_object('admin', auth.uid(), 'note', _note));
  RETURN v_new;
END $$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  SELECT jsonb_build_object(
    'users_total', (SELECT count(*) FROM profiles),
    'users_online', (SELECT count(*) FROM profiles WHERE online_status),
    'users_premium', (SELECT count(*) FROM wallets WHERE is_premium AND premium_ends_at > now()),
    'msgs_today', (SELECT count(*) FROM messages WHERE created_at > now() - interval '24 hours'),
    'msgs_total', (SELECT count(*) FROM messages),
    'revenue_kes_total', (SELECT COALESCE(SUM(amount_kes),0) FROM transactions WHERE status='success' AND kind IN ('topup','premium')),
    'revenue_kes_today', (SELECT COALESCE(SUM(amount_kes),0) FROM transactions WHERE status='success' AND kind IN ('topup','premium') AND created_at > now() - interval '24 hours'),
    'photos_pending', (SELECT count(*) FROM profiles WHERE photo_status = 'pending'),
    'photos_rejected', (SELECT count(*) FROM profiles WHERE photo_status = 'rejected'),
    'suspended', (SELECT count(*) FROM profiles WHERE status IN ('suspended','banned'))
  ) INTO v;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.admin_recent_users(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, nickname text, age integer, status account_status, photo_status photo_moderation_status, online_status boolean, last_seen timestamptz, chats_balance integer, is_premium boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.age, p.status, p.photo_status, p.online_status, p.last_seen,
         COALESCE(w.chats_balance, 0), COALESCE(w.is_premium, false), p.created_at
  FROM profiles p
  LEFT JOIN wallets w ON w.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_status(_target uuid, _status account_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  UPDATE profiles SET status = _status, updated_at = now() WHERE id = _target;
END $$;

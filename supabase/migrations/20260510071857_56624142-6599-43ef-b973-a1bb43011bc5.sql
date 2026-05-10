
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS free_chats_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.debit_chat(_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_balance integer; v_premium boolean; v_expires timestamptz; v_free_enabled boolean;
BEGIN
  SELECT chats_balance, is_premium, premium_ends_at, free_chats_enabled
    INTO v_balance, v_premium, v_expires, v_free_enabled
  FROM wallets WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;
  IF v_premium AND v_expires IS NOT NULL AND v_expires > now() THEN RETURN v_balance; END IF;
  IF NOT COALESCE(v_free_enabled, true) THEN RAISE EXCEPTION 'FREE_CHATS_DISABLED'; END IF;
  IF v_balance < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_CHATS'; END IF;
  UPDATE wallets SET chats_balance = chats_balance - 1, updated_at = now() WHERE user_id = _user;
  INSERT INTO transactions (user_id, kind, chats_delta, status) VALUES (_user, 'debit', -1, 'success');
  RETURN v_balance - 1;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_toggle_free_chats(_target uuid, _enabled boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  UPDATE wallets SET free_chats_enabled = _enabled, updated_at = now() WHERE user_id = _target;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;
  INSERT INTO transactions (user_id, kind, chats_delta, amount_kes, status, reference, meta)
    VALUES (_target, 'topup', 0, 0, 'success',
            CASE WHEN _enabled THEN 'admin_free_on' ELSE 'admin_free_off' END,
            jsonb_build_object('admin', auth.uid()));
  RETURN _enabled;
END $function$;

DROP FUNCTION IF EXISTS public.admin_recent_users(integer);

CREATE OR REPLACE FUNCTION public.admin_recent_users(_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, nickname text, age integer, status account_status, photo_status photo_moderation_status, online_status boolean, last_seen timestamp with time zone, chats_balance integer, is_premium boolean, free_chats_enabled boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nickname, p.age, p.status, p.photo_status, p.online_status, p.last_seen,
         COALESCE(w.chats_balance, 0), COALESCE(w.is_premium, false), COALESCE(w.free_chats_enabled, true), p.created_at
  FROM profiles p
  LEFT JOIN wallets w ON w.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
  LIMIT _limit;
$function$;


-- WALLETS
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY,
  chats_balance integer NOT NULL DEFAULT 5,
  is_premium boolean NOT NULL DEFAULT false,
  premium_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet owner read" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallet owner insert" ON public.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRANSACTIONS
CREATE TYPE public.tx_kind AS ENUM ('topup', 'debit', 'premium', 'bonus');
CREATE TYPE public.tx_status AS ENUM ('pending', 'success', 'failed');
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.tx_kind NOT NULL,
  amount_kes numeric(10,2) NOT NULL DEFAULT 0,
  chats_delta integer NOT NULL DEFAULT 0,
  status public.tx_status NOT NULL DEFAULT 'success',
  reference text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx owner read" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_tx_user ON public.transactions(user_id, created_at DESC);

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pair_order CHECK (user_a < user_b),
  CONSTRAINT pair_unique UNIQUE (user_a, user_b)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "convo participants read" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE INDEX idx_convo_a ON public.conversations(user_a, last_message_at DESC);
CREATE INDEX idx_convo_b ON public.conversations(user_b, last_message_at DESC);

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages participant read" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));
CREATE POLICY "messages mark read" ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b) AND auth.uid() <> sender_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b) AND auth.uid() <> sender_id));
CREATE INDEX idx_msg_convo ON public.messages(conversation_id, created_at DESC);

-- ATOMIC DEBIT
CREATE OR REPLACE FUNCTION public.debit_chat(_user uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance integer; v_premium boolean; v_expires timestamptz;
BEGIN
  SELECT chats_balance, is_premium, premium_ends_at INTO v_balance, v_premium, v_expires
  FROM wallets WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_WALLET'; END IF;
  IF v_premium AND v_expires IS NOT NULL AND v_expires > now() THEN
    RETURN v_balance;
  END IF;
  IF v_balance < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_CHATS'; END IF;
  UPDATE wallets SET chats_balance = chats_balance - 1, updated_at = now() WHERE user_id = _user;
  INSERT INTO transactions (user_id, kind, chats_delta, status) VALUES (_user, 'debit', -1, 'success');
  RETURN v_balance - 1;
END $$;
REVOKE ALL ON FUNCTION public.debit_chat(uuid) FROM public, anon, authenticated;

-- TOPUP (server-only, called from STK confirm)
CREATE OR REPLACE FUNCTION public.credit_wallet(_user uuid, _chats integer, _amount numeric, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wallets SET chats_balance = chats_balance + _chats, updated_at = now() WHERE user_id = _user;
  INSERT INTO transactions (user_id, kind, amount_kes, chats_delta, status, reference) VALUES (_user, 'topup', _amount, _chats, 'success', _ref);
END $$;
REVOKE ALL ON FUNCTION public.credit_wallet(uuid, integer, numeric, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_premium(_user uuid, _amount numeric, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE wallets SET is_premium = true,
    premium_ends_at = GREATEST(COALESCE(premium_ends_at, now()), now()) + interval '30 days',
    updated_at = now() WHERE user_id = _user;
  INSERT INTO transactions (user_id, kind, amount_kes, status, reference) VALUES (_user, 'premium', _amount, 'success', _ref);
END $$;
REVOKE ALL ON FUNCTION public.activate_premium(uuid, numeric, text) FROM public, anon, authenticated;

-- UPDATE handle_new_user TO ALSO CREATE WALLET
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nickname TEXT; v_age INTEGER;
BEGIN
  v_nickname := COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1));
  v_age := COALESCE((NEW.raw_user_meta_data->>'age')::INTEGER, 18);
  IF v_age < 18 THEN RAISE EXCEPTION 'Must be 18 or older'; END IF;
  INSERT INTO public.profiles (id, nickname, age, status, trial_ends_at)
  VALUES (NEW.id, v_nickname, v_age, 'trial_active', now() + interval '2 days');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.wallets (user_id, chats_balance) VALUES (NEW.id, 5);
  INSERT INTO public.transactions (user_id, kind, chats_delta, status, reference)
  VALUES (NEW.id, 'bonus', 5, 'success', 'signup_grant');
  RETURN NEW;
END $$;

-- BACKFILL wallets for existing users
INSERT INTO public.wallets (user_id, chats_balance)
SELECT id, 5 FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.wallets);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

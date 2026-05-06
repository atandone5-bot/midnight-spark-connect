
ALTER FUNCTION public.set_updated_at() SET search_path = public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

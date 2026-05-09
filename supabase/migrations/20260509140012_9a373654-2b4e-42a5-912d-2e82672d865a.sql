
REVOKE EXECUTE ON FUNCTION public.admin_grant_chats(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_recent_users(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_status(uuid, account_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_chats(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_status(uuid, account_status) TO authenticated;

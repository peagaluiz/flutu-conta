CREATE OR REPLACE FUNCTION public.get_family_snapshot()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH current_membership AS (
    SELECT fm.*
    FROM public.familia_membros fm
    WHERE fm.user_id = auth.uid()
      AND fm.status = 'active'
    ORDER BY fm.created_at ASC
    LIMIT 1
), current_family AS (
    SELECT f.*
    FROM public.familias f
    JOIN current_membership cm ON cm.family_id = f.id
), pending AS (
    SELECT
        fi.id,
        fi.family_id,
        f.nome AS family_nome,
        COALESCE(p.nome, p.email) AS invited_by_nome,
        fi.created_at
    FROM public.familia_convites fi
    JOIN public.familias f ON f.id = fi.family_id
    LEFT JOIN public.profiles p ON p.id = fi.invited_by_user_id
    WHERE lower(fi.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      AND fi.status = 'pending'
    ORDER BY fi.created_at DESC
    LIMIT 1
)
SELECT jsonb_build_object(
    'family', (SELECT to_jsonb(cf) FROM current_family cf),
    'membership', (SELECT to_jsonb(cm) FROM current_membership cm),
    'members', COALESCE((
        SELECT jsonb_agg(
            to_jsonb(fm) || jsonb_build_object(
                'user_nome', p.nome,
                'user_email', p.email
            ) ORDER BY fm.created_at
        )
        FROM public.familia_membros fm
        JOIN current_membership cm ON cm.family_id = fm.family_id
        LEFT JOIN public.profiles p ON p.id = fm.user_id
        WHERE fm.status = 'active'
    ), '[]'::jsonb),
    'invites', COALESCE((
        SELECT jsonb_agg(to_jsonb(fi) ORDER BY fi.created_at DESC)
        FROM public.familia_convites fi
        JOIN current_membership cm ON cm.family_id = fi.family_id
        WHERE fi.status = 'pending'
    ), '[]'::jsonb),
    'pending_invite', (SELECT to_jsonb(pending) FROM pending)
);
$$;

REVOKE ALL ON FUNCTION public.get_family_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_family_snapshot() TO authenticated;

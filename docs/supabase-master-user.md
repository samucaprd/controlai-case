# Promover usuário Master (plataforma)

Após o primeiro cadastro, o usuário recebe role `admin` do tenant. Para o dono da plataforma (Admin Master), execute no SQL Editor do Supabase:

```sql
-- Substitua pelo email do dono da plataforma
UPDATE public.perfis
SET role = 'master'
WHERE email = 'seu-email@empresa.com';
```

Verifique:

```sql
SELECT id, email, role, empresa_id FROM public.perfis WHERE role = 'master';
```

**Importante:** não exponha promoção a `master` no fluxo público de registro.

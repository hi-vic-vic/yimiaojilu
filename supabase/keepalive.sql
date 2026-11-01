-- 接种簿 keepalive：每天由 GitHub Actions 调用一次，真实写入一行，避免免费项目被判为闲置而暂停。
create table if not exists public.keepalive (
  id int primary key,
  pinged_at timestamptz not null default now(),
  ping_count bigint not null default 0
);
alter table public.keepalive enable row level security;  -- 不开任何策略，表只能通过下面的函数写

create or replace function public.keepalive()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.keepalive (id, pinged_at, ping_count) values (1, now(), 1)
  on conflict (id) do update set pinged_at = now(), ping_count = public.keepalive.ping_count + 1
  returning pinged_at;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon;

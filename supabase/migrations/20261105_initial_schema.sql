-- роли нужны для разделения действий постановщика и исполнителя
create type public.user_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'in_review', 'accepted', 'rework');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.construction_objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  address text not null check (char_length(trim(address)) > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  object_id uuid not null references public.construction_objects(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id),
  status public.task_status not null default 'new',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  changed_by uuid not null references public.profiles(id),
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  changed_at timestamptz not null default now()
);

create index tasks_assignee_id_idx on public.tasks(assignee_id);
create index tasks_object_id_idx on public.tasks(object_id);
create index task_status_history_task_id_idx on public.task_status_history(task_id, changed_at desc);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger construction_objects_touch_updated_at
before update on public.construction_objects
for each row execute function public.touch_updated_at();

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

-- прямой запрос к tasks не должен обходить правила переходов
create or replace function public.validate_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.user_role;
  transition_allowed boolean := false;
  transition_comment text;
begin
  if old.status = new.status then
    return new;
  end if;

  actor_role := public.current_user_role();

  if actor_role is null then
    raise exception 'Профиль пользователя не найден';
  end if;

  if old.status = 'new' and new.status = 'in_progress' and actor_role = 'executor' and old.assignee_id = auth.uid() then
    transition_allowed := true;
  elsif old.status = 'in_progress' and new.status = 'in_review' and actor_role = 'executor' and old.assignee_id = auth.uid() then
    transition_allowed := true;
  elsif old.status = 'in_review' and new.status = 'accepted' and actor_role = 'manager' then
    transition_allowed := true;
  elsif old.status = 'in_review' and new.status = 'rework' and actor_role = 'manager' then
    transition_allowed := true;
  elsif old.status = 'rework' and new.status = 'in_progress' and actor_role = 'executor' and old.assignee_id = auth.uid() then
    transition_allowed := true;
  end if;

  if not transition_allowed then
    raise exception 'Недопустимый переход статуса';
  end if;

  transition_comment := nullif(trim(current_setting('app.task_comment', true)), '');
  if new.status = 'rework' and transition_comment is null then
    raise exception 'Для возврата на доработку нужен комментарий';
  end if;

  return new;
end;
$$;

create trigger tasks_validate_status_change
before update of status on public.tasks
for each row execute function public.validate_task_status_change();

-- история создаётся базой и не редактируется из интерфейса
create or replace function public.record_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_status_history (
    task_id,
    changed_by,
    from_status,
    to_status,
    comment
  ) values (
    new.id,
    auth.uid(),
    old.status,
    new.status,
    nullif(trim(current_setting('app.task_comment', true)), '')
  );

  return new;
end;
$$;

create trigger tasks_record_status_change
after update of status on public.tasks
for each row when (old.status is distinct from new.status)
execute function public.record_task_status_change();

-- статус меняется через одну функцию, чтобы комментарий попал в историю
create or replace function public.change_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_task public.tasks;
begin
  perform set_config('app.task_comment', coalesce(p_comment, ''), true);

  update public.tasks
  set status = p_new_status
  where id = p_task_id
  returning * into changed_task;

  if changed_task.id is null then
    raise exception 'Задача не найдена или недоступна';
  end if;

  return changed_task;
end;
$$;

revoke all on function public.change_task_status(uuid, public.task_status, text) from public;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

create or replace function public.can_view_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'manager'
    or profile_id = auth.uid()
    or exists (
      select 1
      from public.tasks
      join public.task_status_history on task_status_history.task_id = tasks.id
      where tasks.assignee_id = auth.uid()
        and task_status_history.changed_by = profile_id
    )
$$;

-- rls остаётся последней проверкой даже при обращении к supabase напрямую
alter table public.profiles enable row level security;
alter table public.construction_objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

create policy profiles_select_policy on public.profiles
for select to authenticated
using (public.can_view_profile(id));

create policy objects_select_policy on public.construction_objects
for select to authenticated
using (
  public.current_user_role() = 'manager'
  or exists (
    select 1 from public.tasks
    where tasks.object_id = construction_objects.id
      and tasks.assignee_id = auth.uid()
  )
);

create policy objects_manager_insert_policy on public.construction_objects
for insert to authenticated
with check (public.current_user_role() = 'manager' and created_by = auth.uid());

create policy objects_manager_update_policy on public.construction_objects
for update to authenticated
using (public.current_user_role() = 'manager')
with check (public.current_user_role() = 'manager');

create policy objects_manager_delete_policy on public.construction_objects
for delete to authenticated
using (public.current_user_role() = 'manager');

create policy tasks_select_policy on public.tasks
for select to authenticated
using (public.current_user_role() = 'manager' or assignee_id = auth.uid());

create policy tasks_manager_insert_policy on public.tasks
for insert to authenticated
with check (public.current_user_role() = 'manager' and created_by = auth.uid());

create policy tasks_manager_update_policy on public.tasks
for update to authenticated
using (public.current_user_role() = 'manager')
with check (public.current_user_role() = 'manager');

create policy tasks_manager_delete_policy on public.tasks
for delete to authenticated
using (public.current_user_role() = 'manager');

create policy history_select_policy on public.task_status_history
for select to authenticated
using (
  public.current_user_role() = 'manager'
  or exists (
    select 1 from public.tasks
    where tasks.id = task_status_history.task_id
      and tasks.assignee_id = auth.uid()
  )
);

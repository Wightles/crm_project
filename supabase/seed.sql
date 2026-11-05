-- перед запуском создай этих пользователей в Authentication → Users
-- пароли можно задать свои, важно сохранить их для проверки входа

begin;

do $$
begin
  if not exists (select 1 from auth.users where email = 'manager.crm@example.com')
    or not exists (select 1 from auth.users where email = 'executor.one@example.com')
    or not exists (select 1 from auth.users where email = 'executor.two@example.com') then
    raise exception 'сначала создай трёх пользователей в Authentication → Users';
  end if;
end;
$$;

insert into public.profiles (id, full_name, role)
select id, 'Алексей Кузнецов', 'manager'::public.user_role
from auth.users where email = 'manager.crm@example.com'
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

insert into public.profiles (id, full_name, role)
select id, 'Иван Петров', 'executor'::public.user_role
from auth.users where email = 'executor.one@example.com'
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

insert into public.profiles (id, full_name, role)
select id, 'Анна Смирнова', 'executor'::public.user_role
from auth.users where email = 'executor.two@example.com'
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

insert into public.construction_objects (id, name, address, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'ЖК «Северный парк»', 'ул. Лесная, 18', (select id from auth.users where email = 'manager.crm@example.com')),
  ('10000000-0000-0000-0000-000000000002', 'Коттедж на Лесной', 'Лесная, 42', (select id from auth.users where email = 'manager.crm@example.com')),
  ('10000000-0000-0000-0000-000000000003', 'Офисный центр «Маяк»', 'пр. Мира, 7', (select id from auth.users where email = 'manager.crm@example.com'))
on conflict (id) do update set name = excluded.name, address = excluded.address;

insert into public.tasks (title, description, object_id, assignee_id, status, created_by) values
  ('Подготовить чертежи лестницы', 'Подготовить комплект чертежей для согласования.', '10000000-0000-0000-0000-000000000001', (select id from auth.users where email = 'executor.one@example.com'), 'in_review', (select id from auth.users where email = 'manager.crm@example.com')),
  ('Проверить поставку окон', 'Сверить количество и размеры окон с накладной.', '10000000-0000-0000-0000-000000000002', (select id from auth.users where email = 'executor.two@example.com'), 'in_progress', (select id from auth.users where email = 'manager.crm@example.com')),
  ('Согласовать цвет фасада', 'Получить финальное решение по цвету фасада.', '10000000-0000-0000-0000-000000000001', (select id from auth.users where email = 'executor.one@example.com'), 'new', (select id from auth.users where email = 'manager.crm@example.com')),
  ('Принять исполнительную документацию', 'Проверить комплект исполнительной документации.', '10000000-0000-0000-0000-000000000003', (select id from auth.users where email = 'executor.two@example.com'), 'accepted', (select id from auth.users where email = 'manager.crm@example.com'));

commit;

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20261105_initial_schema.sql', import.meta.url), 'utf8')

describe('Supabase migration', () => {
  it('creates the tables required by the CRM', () => {
    expect(migration).toContain('create table public.profiles')
    expect(migration).toContain('create table public.construction_objects')
    expect(migration).toContain('create table public.tasks')
    expect(migration).toContain('create table public.task_status_history')
  })

  it('enables RLS for every application table', () => {
    expect(migration).toContain('alter table public.profiles enable row level security')
    expect(migration).toContain('alter table public.construction_objects enable row level security')
    expect(migration).toContain('alter table public.tasks enable row level security')
    expect(migration).toContain('alter table public.task_status_history enable row level security')
  })

  it('protects status transitions and writes immutable history', () => {
    expect(migration).toContain('create trigger tasks_validate_status_change')
    expect(migration).toContain('create trigger tasks_record_status_change')
    expect(migration).toContain('create or replace function public.change_task_status')
    expect(migration).not.toMatch(/create policy .* on public\.task_status_history[\s\S]*for (insert|update|delete)/i)
  })

  it('allows direct task updates only to managers', () => {
    expect(migration).toContain('create policy tasks_manager_update_policy on public.tasks')
    expect(migration).not.toContain("assignee_id = auth.uid())\nwith check (public.current_user_role() = 'manager' or assignee_id = auth.uid())")
  })

  it('does not add an open registration policy', () => {
    expect(migration).not.toMatch(/create policy .* on auth\.users/i)
    expect(migration).not.toContain('signUp')
  })
})

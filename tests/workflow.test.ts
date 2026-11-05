import { describe, expect, it } from 'vitest'
import { getAvailableTaskActions, isAllowedTransition } from '../src/lib/workflow'

describe('workflow actions', () => {
  it('shows only executor actions for an assigned task', () => {
    expect(getAvailableTaskActions('new', 'executor').map((action) => action.status)).toEqual(['in_progress'])
    expect(getAvailableTaskActions('in_progress', 'executor').map((action) => action.status)).toEqual(['in_review'])
    expect(getAvailableTaskActions('rework', 'executor').map((action) => action.status)).toEqual(['in_progress'])
  })

  it('shows both review decisions to a manager', () => {
    expect(getAvailableTaskActions('in_review', 'manager').map((action) => action.status)).toEqual(['accepted', 'rework'])
  })

  it('does not expose actions in terminal or unrelated states', () => {
    expect(getAvailableTaskActions('accepted', 'manager')).toEqual([])
    expect(getAvailableTaskActions('new', 'manager')).toEqual([])
    expect(getAvailableTaskActions('in_review', 'executor')).toEqual([])
  })

  it('matches the transition matrix used by the database', () => {
    expect(isAllowedTransition('new', 'in_progress', 'executor')).toBe(true)
    expect(isAllowedTransition('in_progress', 'in_review', 'executor')).toBe(true)
    expect(isAllowedTransition('in_review', 'accepted', 'manager')).toBe(true)
    expect(isAllowedTransition('in_review', 'rework', 'manager')).toBe(true)
    expect(isAllowedTransition('new', 'accepted', 'manager')).toBe(false)
    expect(isAllowedTransition('in_review', 'in_progress', 'executor')).toBe(false)
  })
})

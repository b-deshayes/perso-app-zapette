import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStreamsStore } from './streams'

describe('useStreamsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('add / remove', () => {
    it('should_give_audio_to_first_channel_only', () => {
      const store = useStreamsStore()
      expect(store.add('zerator')).toBe('added')
      expect(store.add('https://www.twitch.tv/amixem')).toBe('added')
      expect(store.channels).toEqual([
        { name: 'zerator', muted: false },
        { name: 'amixem', muted: true },
      ])
    })

    it('should_reject_duplicates_invalid_and_overflow', () => {
      const store = useStreamsStore()
      store.add('zerator')
      expect(store.add('ZeratoR')).toBe('exists')
      expect(store.add('!!')).toBe('invalid')
      for (let i = 0; i < 11; i++) store.add(`chaine${i}`)
      expect(store.count).toBe(12)
      expect(store.add('encore')).toBe('full')
    })

    it('should_move_focus_to_neighbour_when_removing_focused', () => {
      const store = useStreamsStore()
      ;['a1', 'b2', 'c3'].forEach((n) => store.add(n))
      store.focus('b2')
      store.remove('b2')
      expect(store.focused).toBe('c3')
      expect(store.audible).toEqual(['c3'])
      store.remove('c3')
      expect(store.focused).toBe('a1')
      store.remove('a1')
      expect(store.focused).toBeNull()
      expect(store.count).toBe(0)
    })
  })

  describe('focus & audio', () => {
    it('should_solo_focused_then_restore_mutes_on_unfocus', () => {
      const store = useStreamsStore()
      ;['a1', 'b2', 'c3'].forEach((n) => store.add(n))
      store.setMuted('c3', false) // a1 et c3 audibles
      store.focus('b2')
      expect(store.mode).toBe('focus')
      expect(store.audible).toEqual(['b2'])
      store.focus('c3') // on change de focus sans repasser par la grille
      expect(store.audible).toEqual(['c3'])
      store.unfocus()
      expect(store.mode).toBe('grid')
      expect(store.audible).toEqual(['a1', 'c3'])
    })

    it('should_toggle_focus_with_index_and_cycle', () => {
      const store = useStreamsStore()
      ;['a1', 'b2', 'c3'].forEach((n) => store.add(n))
      store.focusIndex(1)
      expect(store.focused).toBe('b2')
      store.focusIndex(1)
      expect(store.focused).toBeNull()
      store.cycleFocus(1)
      expect(store.focused).toBe('a1')
      store.cycleFocus(-1)
      expect(store.focused).toBe('c3')
      store.focusIndex(9)
      expect(store.focused).toBe('c3')
    })

    it('should_toggle_all_audio', () => {
      const store = useStreamsStore()
      ;['a1', 'b2'].forEach((n) => store.add(n))
      store.toggleAllAudio()
      expect(store.audible).toEqual([])
      store.toggleAllAudio()
      expect(store.audible).toEqual(['a1'])
      store.focus('b2')
      store.toggleAllAudio()
      expect(store.audible).toEqual([])
      store.toggleAllAudio()
      expect(store.audible).toEqual(['b2'])
    })
  })

  describe('order & snapshot', () => {
    it('should_move_channels_within_bounds', () => {
      const store = useStreamsStore()
      ;['a1', 'b2', 'c3'].forEach((n) => store.add(n))
      store.move('c3', -1)
      expect(store.channels.map((c) => c.name)).toEqual(['a1', 'c3', 'b2'])
      store.move('a1', -1)
      expect(store.channels.map((c) => c.name)).toEqual(['a1', 'c3', 'b2'])
      store.move('b2', 1)
      expect(store.channels.map((c) => c.name)).toEqual(['a1', 'c3', 'b2'])
    })

    it('should_hydrate_and_snapshot_symmetrically', () => {
      const store = useStreamsStore()
      const snapshot = {
        channels: [
          { name: 'a1', muted: true },
          { name: 'b2', muted: false },
        ],
        focused: 'b2',
        strip: false,
        chat: true,
      }
      store.hydrate(snapshot)
      expect(store.snapshot()).toEqual(snapshot)
      expect(store.chatChannel).toBe('b2')
      store.hydrate({ ...snapshot, focused: 'inconnu' })
      expect(store.focused).toBeNull()
    })
  })
})

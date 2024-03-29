/**
 * @jest-environment node
 */
import { describeUnix } from '../../utils/test/helpers'

import { MakeId, ExeMaskAll, ExeMaskGroup, ExeMaskUser, filetype, sameID, FileID } from '../Fs'

describe('makeId', () => {
    it('should return FileID from stats', () => {
        const stats = {
            ino: 123n,
            dev: 456n,
            fullname: 'foo',
        }

        expect(MakeId(stats)).toEqual({
            ino: stats.ino,
            dev: stats.dev,
        })
    })
})

describe('sameID', () => {
    const id1: FileID = {
        dev: 10n,
        ino: 5n,
    }

    const id2: FileID = {
        dev: 28n,
        ino: 32n,
    }

    it('should return true if ino & dev are identical', () => {
        expect(sameID(id1, id1)).toBe(true)
    })

    it('should return true if ino & dev are identical', () => {
        expect(sameID(id1, id2)).toBe(false)
    })
})

describeUnix('filetype mode detection', () => {
    it('should return exe if user is owner of +x file', () => {
        const gid = process.getgid()
        const uid = process.getuid()
        const mode = ExeMaskUser

        const type = filetype(mode, gid, uid, '')
        expect(type).toBe('exe')
    })

    it('should return exe if user is in group of +x file', () => {
        const gid = process.getgid()
        const uid = process.getuid()
        const mode = ExeMaskGroup

        const type = filetype(mode, gid, uid, '')
        expect(type).toBe('exe')
    })

    it('should return exe file is +x for all', () => {
        const mode = ExeMaskAll

        const type = filetype(mode, 0, 0, '')
        expect(type).toBe('exe')
    })

    it('should not return exe if mode === -1', () => {
        const gid = process.getgid()
        const uid = process.getuid()
        const type = filetype(-1, gid, uid, '')

        expect(type).not.toEqual('exe')
    })
})

describe('filetype extension detection', () => {
    it('should return exe if extensions === ".bar.exe"', () => {
        const extension = '.bar.exe'
        expect(filetype(-1, 0, 0, extension)).toBe('exe')
    })

    it('should return exe if extension === ".exe"', () => {
        const extension = '.exe'
        expect(filetype(-1, 0, 0, extension)).toBe('exe')
    })

    it('should return no filetype if extension === ""', () => {
        const extension = ''
        expect(filetype(-1, 0, 0, extension)).toBe('')
    })
})

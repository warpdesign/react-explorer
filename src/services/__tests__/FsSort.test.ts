/**
 * @jest-environment node
 */
import { getSortMethod } from '../FsSort'
import { FileDescriptor } from '../Fs'

const files: Array<FileDescriptor> = [
    {
        dir: '/',
        fullname: 'foo',
        name: 'foo',
        extension: '',
        cDate: new Date('2018-12-14T10:01:38.502Z'),
        mDate: new Date('2018-12-14T10:01:38.502Z'),
        bDate: new Date('2018-12-14T10:01:38.502Z'),
        length: 90,
        mode: 16877,
        isDir: true,
        readonly: false,
        id: {
            ino: 0n,
            dev: 1n,
        },
        isSym: false,
        target: '',
        type: '',
    },
    {
        dir: '/',
        fullname: 'racine.txt',
        name: 'racine',
        extension: '.txt',
        cDate: new Date('2018-12-12T10:01:38.493Z'),
        mDate: new Date('2018-12-12T10:01:38.493Z'),
        bDate: new Date('2018-12-12T10:01:38.493Z'),
        length: 80,
        mode: 33188,
        isDir: false,
        readonly: false,
        id: {
            ino: 1n,
            dev: 1n,
        },
        isSym: false,
        target: '',
        type: '',
    },
    {
        dir: '/',
        fullname: 'bump.mp4',
        name: 'bump',
        extension: '.mp4',
        cDate: new Date('2018-12-13T10:01:38.493Z'),
        mDate: new Date('2018-12-13T10:01:38.493Z'),
        bDate: new Date('2018-12-13T10:01:38.493Z'),
        length: 120,
        mode: 33188,
        isDir: false,
        readonly: false,
        id: {
            ino: 2n,
            dev: 1n,
        },
        isSym: false,
        target: '',
        type: '',
    },
    {
        dir: '/',
        fullname: 'sound.mp3',
        name: 'sound',
        extension: '.mp3',
        cDate: new Date('2018-12-12T10:04:38.493Z'),
        mDate: new Date('2018-12-12T10:04:38.493Z'),
        bDate: new Date('2018-12-12T10:04:38.493Z'),
        length: 100,
        mode: 33188,
        isDir: false,
        readonly: false,
        id: {
            ino: 3n,
            dev: 1n,
        },
        isSym: false,
        target: '',
        type: '',
    },
]

describe('sorting methods', () => {
    it('sort by Name/Asc', () => {
        const sortMethod = getSortMethod('name', 'asc')
        const sorted_ids = files.sort(sortMethod).map((file) => file.id.ino)
        expect(sorted_ids).toEqual([2n, 0n, 1n, 3n])
    })

    it('sort by Name/Desc', () => {
        const sortMethod = getSortMethod('name', 'desc')
        const sorted_ids = files.sort(sortMethod).map((file) => file.id.ino)
        expect(sorted_ids).toEqual([3n, 1n, 0n, 2n])
    })

    it('sort by Size/Asc', () => {
        const sortMethod = getSortMethod('size', 'asc')
        const sorted_ids = files.sort(sortMethod).map((file) => file.id.ino)
        expect(sorted_ids).toEqual([1n, 0n, 3n, 2n])
    })

    it('sort by Size/Asc', () => {
        const sortMethod = getSortMethod('size', 'desc')
        const sorted_ids = files.sort(sortMethod).map((file) => file.id.ino)
        expect(sorted_ids).toEqual([2n, 3n, 0n, 1n])
    })
})

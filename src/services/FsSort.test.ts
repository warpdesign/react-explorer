import { getSortMethod } from './FsSort';
import { File } from './Fs';

const files: Array<File> = [{
    "dir": "/",
    "fullname": "foo",
    "name": "foo",
    "extension": "",
    "cDate": new Date("2018-12-14T10:01:38.502Z"),
    "mDate": new Date("2018-12-14T10:01:38.502Z"),
    "bDate": new Date("2018-12-14T10:01:38.502Z"),
    "length": 90,
    "mode": 16877,
    "isDir": true,
    "readonly": false,
    "id": {
        "ino": 0,
        "dev": 1
    },
    isSym: false,
    type: ''
},
{
    "dir": "/",
    "fullname": "racine.txt",
    "name": "racine",
    "extension": ".txt",
    "cDate": new Date("2018-12-12T10:01:38.493Z"),
    "mDate": new Date("2018-12-12T10:01:38.493Z"),
    "bDate": new Date("2018-12-12T10:01:38.493Z"),
    "length": 80,
    "mode": 33188,
    "isDir": false,
    "readonly": false,
    "id": {
        "ino": 1,
        "dev": 1
    },
    isSym: false,
    type: ''
},
{
    "dir": "/",
    "fullname": "bump.mp4",
    "name": "bump",
    "extension": ".mp4",
    "cDate": new Date("2018-12-13T10:01:38.493Z"),
    "mDate": new Date("2018-12-13T10:01:38.493Z"),
    "bDate": new Date("2018-12-13T10:01:38.493Z"),
    "length": 120,
    "mode": 33188,
    "isDir": false,
    "readonly": false,
    "id": {
        "ino": 2,
        "dev": 1
    },
    isSym: false,
    type: ''
},
{
    "dir": "/",
    "fullname": "sound.mp3",
    "name": "sound",
    "extension": ".mp3",
    "cDate": new Date("2018-12-12T10:04:38.493Z"),
    "mDate": new Date("2018-12-12T10:04:38.493Z"),
    "bDate": new Date("2018-12-12T10:04:38.493Z"),
    "length": 100,
    "mode": 33188,
    "isDir": false,
    "readonly": false,
    "id": {
        "ino": 3,
        "dev": 1
    },
    isSym: false,
    type: ''
}];

describe('sorting methods', () => {
    it('sort by Name/Asc', () => {
        const sortMethod = getSortMethod('name', 'asc');
        const sorted_ids = files.sort(sortMethod).map(file => file.id.ino);
        expect(sorted_ids).toEqual([2, 0, 1, 3]);
    });

    it('sort by Name/Desc', () => {
        const sortMethod = getSortMethod('name', 'desc');
        const sorted_ids = files.sort(sortMethod).map(file => file.id.ino);
        expect(sorted_ids).toEqual([3, 1, 0, 2]);
    });

    it('sort by Size/Asc', () => {
        const sortMethod = getSortMethod('size', 'asc');
        const sorted_ids = files.sort(sortMethod).map(file => file.id.ino);
        expect(sorted_ids).toEqual([1, 0, 3, 2]);
    });

    it('sort by Size/Asc', () => {
        const sortMethod = getSortMethod('size', 'desc');
        const sorted_ids = files.sort(sortMethod).map(file => file.id.ino);
        expect(sorted_ids).toEqual([2, 3, 0, 1]);
    });
});
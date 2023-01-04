import { DirectoryJSON, vol } from 'memfs'

export const VolumeJSON: DirectoryJSON = {
    foo: null,
    'racine.txt': '',
    'video.mp4': '',
    'sound.mp3': '',
    'archive.tar.gz': '',
    'data.json': '',
    'specs.doc': '',
    'win.com': '',
    'doom.wad.zip': '',
    empty_file: '',
    'image.jpg': '',
    'react-explorer.js': '',
    file3: '',
    file4: '',
    folder2: null,
    file5: '',
    file6: '',
    file7: '',
    file8: '',
    '/foo/bar/file1': '',
    '/foo/bar/file2': '',
    '/cy/downloads': null,
    '/cy/music': null,
    '/cy/pictures': null,
    '/cy/desktop': null,
    '/cy/documents': null,
    '/cy/home': null,
    '/cy/videos': null,
}

export default function () {
    vol.fromJSON(VolumeJSON, '/')
}

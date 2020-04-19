import mock from 'mock-fs';
import { tmpdir } from 'os';

const TEST_FILES_DIR = tmpdir() + '/react-explorer-tests';

const TmpDir = {
    [TEST_FILES_DIR]: {
        file: 'aa',
        link: mock.symlink({
            path: 'file'
        }),
        sizeTest: {
            '14bytes': Buffer.alloc(14),
            '1024bytes': Buffer.alloc(1024)
        },
        linkToSizeTest: mock.symlink({
            path: 'sizeTest'
        }),
        makedirTest: {
            denied: mock.directory({
                mode: 0o000
            })
        },
        deleteTest: {
            folder_denied: mock.directory({
                mode: 0o000,
                items: {
                    file: ''
                }
            }),
            file_denied: mock.file({
                content: '',
                mode: 0o000
            }),
            file: Buffer.alloc(1024),
            single_folder: {
                file1: '',
                file2: ''
            },
            multiple_folder: {
                file1: '',
                sub_folder: {
                    file_sub: ''
                }
            }
        }
    }
};

export default TmpDir;

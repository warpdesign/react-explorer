import { getSelectionRange, getExtensionIndex } from '../fileUtils';

describe('fileUtils', () => {
    it('getSelectionRange: should exclude both extensions for archive.tar.gz', () => {
        const filename = 'archive.tar.gz';
        const range = getSelectionRange(filename);
        expect(range).toEqual({
            start: 0,
            end: 7
        });
    });

    it('getSelectionRange: should only exclude leading point for .gitignore', () => {
        const filename = '.gitignore';
        const range = getSelectionRange(filename);
        expect(range).toEqual({
            start: 1,
            end: 10
        });
    });

    it('getSelectionRange: should select everything if for my_file', () => {
        const filename = 'my_file';
        const range = getSelectionRange(filename);
        expect(range).toEqual({
            start: 0,
            end: 7
        });
    });

    it('getExtensionIndex: should return extension position for archive.tar.gz', () => {
        const pos = getExtensionIndex('archive.tar.gz');
        expect(pos).toBe(7);
    });

    it('getExtensionIndex: should return -1 when no known extension', () => {
        const pos = getExtensionIndex('my_file');
        expect(pos).toBe(-1);
    });
});
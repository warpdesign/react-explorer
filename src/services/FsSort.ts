import { File } from './Fs';

export type TSORT_ORDER = 'asc' | 'desc';
export type TSORT_METHOD_NAME = 'ctime' | 'btime' | 'name' | 'size';
export type TSORT_METHOD = (file1: File, file2: File) => number;

export type ISORT_METHODS = {
    [key in TSORT_METHOD_NAME]: TSORT_METHOD;
};

export function getSortMethod(method: TSORT_METHOD_NAME, order: TSORT_ORDER): TSORT_METHOD {
    if (order === 'asc') {
        return SortMethods[method];
    } else {
        return (function (sortMethod) {
            return function (file1: File, file2: File) {
                const res = sortMethod(file1, file2);
                return res !== 0 ? -1 * res : 0;
            };
        })(SortMethods[method]);
    }
}

export const SortMethods: ISORT_METHODS = {
    name: sortName,
    ctime: (file1: File, file2: File) => sortTime(file1.mDate, file2.mDate),
    btime: (file1: File, file2: File) => sortTime(file1.bDate, file2.bDate),
    size: (file1: File, file2: File) => sortSize(file1, file2),
};

function sortSize(file1: File, file2: File): number {
    if (file1.length < file2.length) {
        return -1;
    } else if (file1.length > file2.length) {
        return 1;
    } else {
        return 0;
    }
}

function sortTime(t1: Date, t2: Date): number {
    if (t1 > t2) {
        return -1;
    } else if (t1 < t2) {
        return 1;
    } else {
        return 0;
    }
}

function sortName(file1: File, file2: File): number {
    return file1.fullname.localeCompare(file2.fullname);
}

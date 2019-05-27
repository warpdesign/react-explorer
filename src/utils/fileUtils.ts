import { Extensions } from '../services/Fs';

export const REGEX_EXTENSION = /\.(?=[^0-9])/;

export interface SelectionRange {
    start: number;
    length: number;
}

function getExtensionIndex(filename: string): number {
    let index = -1;
    let found = true;

    while (found) {
        found = false;
        for (let ext of Object.keys(Extensions)) {
            const matches = filename.match(Extensions[ext]);
            if (matches && (index === -1 || matches.index < index)) {
                found = true;
                index = matches.index;
                filename = filename.substring(0, filename.length - filename.substring(index).length);
            }
        }
    }


    return index;
}

export function getSelectionRange(filename: string): SelectionRange {
    const length = filename.length;

    if (filename.startsWith('.')) {
        return {
            start: 1,
            length: length
        };
    } else {
        const index = getExtensionIndex(filename);
        if (index > -1) {
            return {
                start: 0,
                length: index
            };
        } else {
            return {
                start: 0,
                length: length
            };
        }
    }
}
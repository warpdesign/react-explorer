import { Extensions } from '../services/Fs';

export const REGEX_EXTENSION = /\.(?=[^0-9])/;

export interface SelectionRange {
    start: number;
    end: number;
}

export function getExtensionIndex(filename: string): number {
    let index = -1;
    for (const ext of Object.keys(Extensions)) {
        const matches = filename.match(Extensions[ext]);
        if (matches && (index === -1 || matches.index < index)) {
            index = matches.index;
        }
    }

    return index;
}

export function getSelectionRange(filename: string): SelectionRange {
    const length = filename.length;

    if (filename.startsWith('.')) {
        return {
            start: 1,
            end: length,
        };
    } else {
        const index = getExtensionIndex(filename);
        if (index > -1) {
            return {
                start: 0,
                end: index,
            };
        } else {
            return {
                start: 0,
                end: length,
            };
        }
    }
}

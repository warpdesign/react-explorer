import { File } from '../services/Fs';
import { LocalizedError } from '../locale/error';

export interface FileTransfer {
    file: File;
    status: 'started' | 'cancelled' | 'error' | 'done' | 'queued';
    progress: number;
    subDirectory: string;
    newSub: string;
    ready: boolean;
    error?: LocalizedError;
}

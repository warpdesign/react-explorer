import { File } from "../services/Fs";

export interface FileTransfer {
    file: File;
    status: 'started' | 'cancelled' | 'error' | 'done' | 'queued';
    progress: number;
    subDirectory: string;
    newSub: string;
    ready: boolean;
}
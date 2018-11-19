import { File } from "../services/Fs";

export interface FileTransfer {
    file: File;
    status: 'started' | 'stopped' | 'error' | 'done' | 'queued';
    progress: number;
    subDirectory: string;
    ready: boolean;
}
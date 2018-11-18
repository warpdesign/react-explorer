import { File } from "../services/Fs";

export interface FileTransfer {
    file: File;
    status: 'started' | 'stopped' | 'error' | 'done' | 'todo';
    progress: number;
    subDirectory: string
}
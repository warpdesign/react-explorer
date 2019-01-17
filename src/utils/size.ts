import * as folderSize from 'get-folder-size';

export function size(path: string): Promise<number> {
    return new Promise((resolve, reject) => {
        folderSize(path, (err:Error, size: number) => {
            if (err) {
                reject(err);
            } else {
                resolve(size);
            }
        });
    });
}

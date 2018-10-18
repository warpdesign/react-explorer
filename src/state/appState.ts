import { action, observable, runInAction, computed, autorun, isObservableMap, isObservable } from 'mobx';
import { Directory, Fs } from '../services/Fs';
import * as path from 'path';

interface Clipboard {
    source: 'local' | 'remote';
    elements: string[];
}

export class AppState {
    readingRemote: Promise<Array<any>>;
    readingLocal: Promise<Array<any>>;

    /** new stuff */
    caches: Directory[] = new Array();

    // TODO: type ??
    @action
    addCache(type: string = 'local', path: string = '.') {
        console.log('addCache');
        const cache:Directory = observable({
            path,
            files: new Array()
        });

        this.caches.push(cache);

        return cache;
    }

    // TODO: type ??
    @action
    updateCache(cache: Directory, newPath: string) {
        Fs.readDirectory(newPath)
            .then((files) => {
                console.log('yeah, got files 2', files);
                runInAction(() => {
                    cache.files = files;
                    cache.path = path.resolve(newPath);
                });
            });
    }
    /** /new */

    // global
    @observable
    clipboard: Clipboard = {
        source: 'local',
        elements: []
    };

    @action
    setClipboard(source: 'local' | 'remote', elements: string[]) {
        this.clipboard = { source, elements };
    }

    constructor() {
        // TODO: get initial path values ?
        this.readingRemote = Promise.resolve(Array());
        this.readingLocal = Promise.resolve(Array());
    }
}
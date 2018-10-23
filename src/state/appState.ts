import { action, observable, runInAction, computed, autorun, isObservableMap, isObservable } from 'mobx';
import { Directory, Fs, DirectoryType, File } from '../services/Fs';
import * as path from 'path';

interface Clipboard {
    source: DirectoryType;
    elements: string[];
}

export class AppState {
    readingRemote: Promise<Array<any>>;
    readingLocal: Promise<Array<any>>;

    /** new stuff */
    caches: Directory[] = new Array();

    @action
    addCache(type: DirectoryType = DirectoryType.LOCAL, path: string = '.') {
        console.log('addCache');
        const cache:Directory = observable({
            path,
            files: new Array(),
            type,
            selected: new Array()
        });

        this.caches.push(cache);

        return cache;
    }

    @action
    updateSelection(cache: Directory, newSelection: File[]) {
        cache.selected = newSelection;
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
                    cache.selected = new Array();
                });
            });
    }
    /** /new */

    // global
    @observable
    clipboard: Clipboard = {
        source: DirectoryType.LOCAL,
        elements: []
    };

    @action
    setClipboard(source: DirectoryType, elements: string[]) {
        this.clipboard = { source, elements };
    }

    constructor() {
        // TODO: get initial path values ?
        this.readingRemote = Promise.resolve(Array());
        this.readingLocal = Promise.resolve(Array());
    }
}
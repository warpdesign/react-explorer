import { action, observable, runInAction, computed, autorun, isObservableMap, isObservable } from 'mobx';
import { Directory, Fs, DirectoryType, File } from '../services/Fs';
import * as path from 'path';

interface Clipboard {
    type: DirectoryType;
    source: string;
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
                

                // if (forceSync) {
                //     this.refreshCache(cache);
                // }
            });
    }
    /** /new */

    @action
    refreshCache(cache: Directory, sync = false) {
        this.updateCache(cache, cache.path);
    }

    @action syncCaches(source: Directory) {
        for (let cache of this.caches) {
            // only refresh cache that don't have files selected: we don't we to lose
            // the user's selection
            // we could do even better and keep the user's selection while refreshing
            if (source !== cache && cache.path === source.path && !cache.selected.length) {
                this.refreshCache(cache);
            }
        }
    }

    // global
    @observable
    clipboard: Clipboard = {
        type: DirectoryType.LOCAL,
        source: '',
        elements: []
    };

    @action
    setClipboard(type: DirectoryType, source: string, elements: string[]) {
        this.clipboard = { source, type, elements };
    }

    constructor() {
        // TODO: get initial path values ?
        this.readingRemote = Promise.resolve(Array());
        this.readingLocal = Promise.resolve(Array());
    }
}
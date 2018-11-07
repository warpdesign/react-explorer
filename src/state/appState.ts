import { action, observable } from 'mobx';
import { Directory, File } from '../services/Fs';

interface Clipboard {
    type: string;
    source: string;
    elements: string[];
}

export class AppState {
    /** new stuff */
    caches: Directory[] = new Array();

    @action
    addCache(path: string = '') {
        console.log('addCache');
        const cache = new Directory(path);
        // const cache:Directory = observable({
        //     path,
        //     files: new Array(),
        //     selected: new Array(),
        //     FS: getFs(path)
        // });

        this.caches.push(cache);

        return cache;
    }

    @action
    updateSelection(cache: Directory, newSelection: File[]) {
        cache.selected.replace(newSelection);
    }

    // @action updateFS(cache: Directory, path: string) {
    //     if (cache.path.substr(0, 5) !== path.substr(0, 5)) {
    //         cache.FS = getFs(path);
    //         console.log('updateFS: FS may have changed, new FS:', cache.FS.name);
    //     }
    // }

    // @action
    // updateCache(cache: Directory, newPath: string) {
    //     this.updateFS(cache, newPath);

    //     cache.FS.readDirectory(newPath)
    //         .then((files: File[]) => {
    //             runInAction(() => {
    //                 cache.files = files;
    //                 cache.path = cache.FS.resolve(newPath);
    //                 cache.selected = new Array();
    //             });


    //             // if (forceSync) {
    //             //     this.refreshCache(cache);
    //             // }
    //         })
    //         .catch((err) => {
    //             console.log('error reading directory', err);
    //         });
    // }
    /** /new */

    // @action
    // refreshCache(cache: Directory, sync = false) {
    //     this.updateCache(cache, cache.path);
    // }

    // @action syncCaches(source: Directory) {
    //     for (let cache of this.caches) {
    //         // only refresh cache that don't have files selected: we don't we to lose
    //         // the user's selection
    //         // we could do even better and keep the user's selection while refreshing
    //         if (source !== cache && cache.path === source.path && !cache.selected.length) {
    //             this.refreshCache(cache);
    //         }
    //     }
    // }

    // global
    @observable
    clipboard: Clipboard = {
        type: 'local',
        source: '',
        elements: []
    };

    @action
    setClipboard(type: string, source: string, elements: string[]) {
        this.clipboard = { source, type, elements };
    }

    constructor() {
    }
}
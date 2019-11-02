import { observable, action, computed } from "mobx";
import { ViewState } from "./viewState";
import { ipcRenderer } from "electron";

export interface WindowSettings {
    splitView: boolean;
};

export class WinState {
    @observable splitView = false;

    static id = 0;

    id = 0;
    // two views per window now
    // we'll need to extend it if we decide
    // to have multiple windows (which may or may not
    // have several views)
    views: ViewState[] = observable<ViewState>([]);  

    constructor(options:WindowSettings) {
        this.id = WinState.id++;
        this.splitView = options.splitView;
        console.log('WinState', this.id, WinState.id);
    }    

    @action
    toggleSplitViewMode() {
        this.splitView = !this.splitView;

        if (!this.splitView) {
            this.setActiveView(0);
        } else {
            this.setActiveView(1);
        }

        // send new value to main process
        console.log('calling setWindowSettings', this.toJSON);
        ipcRenderer.send("setWindowSettings", this.toJSON);
    }

    @computed
    get toJSON():any {
        return {
            id: this.id,
            settings: {
                splitView: this.splitView
            }
        };
    }

    /**
     * first view is activated, and first tab set to visible
     */
    @action
    initState() {
        this.views[0].isActive = true;
        for (let view of this.views) {
            // get and activate the first cache for now
            view.setVisibleCache(0);
        }
    }

    getOrCreateView(viewId: number) {
        let view = this.getView(viewId);

        if (!view) {
            view = this.createView(viewId);
            this.views[viewId] = view;
        }

        return view;
    }

    /**
     * Changes the active file cache
     *
     * @param active the number of the cache to be the new active one
     */
    @action
    setActiveView(viewId: number) {
        console.log("setting active view", viewId);
        const previous = this.getActiveView();
        const next = this.getView(viewId);
        previous.isActive = false;
        next.isActive = true;
    }

    getActiveView():ViewState {
        return this.getViewByActive(true);
    }

    getInactiveView():ViewState {
        return this.getViewByActive(false);
    }

    /**
     * returns active or invactive view
     * @param isActive if set to true returns the active view, otherwise inactive one
     */
    getViewByActive(isActive = true): ViewState {
        return this.views.find(view => view.isActive === isActive);
    }

    getView(viewId: number) {
        return this.views.find(view => view.viewId === viewId);
    }

    createView(viewId: number) {
        return new ViewState(viewId);
    }    
}

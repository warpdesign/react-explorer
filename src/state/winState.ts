import { observable, action } from "mobx";
import { ViewState } from "./viewState";

export class WinState {
    @observable splitView = false;

    // two views per window now
    // we'll need to extend it if we decide
    // to have multiple windows (which may or may not
    // have several views)
    views: ViewState[] = observable<ViewState>([]);  
    
    @action
    toggleSplitViewMode() {
        this.splitView = !this.splitView;
        // TODO:
        // if toggled
        // 1. make 
        // if not toggled
        if (!this.splitView) {
            this.setActiveView(0);
        }

        // send new value to main process
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
        const previous = this.getActiveView(true);
        const next = this.getView(viewId);
        previous.isActive = false;
        next.isActive = true;
    }

    getActiveView(isActive = true): ViewState {
        return this.views.find(view => view.isActive === isActive);
    }

    getView(viewId: number) {
        return this.views.find(view => view.viewId === viewId);
    }

    createView(viewId: number) {
        return new ViewState(viewId);
    }    
}

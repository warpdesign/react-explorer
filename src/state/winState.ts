import { observable, action, computed, makeObservable } from 'mobx'
import { ipcRenderer } from 'electron'

import { ViewState } from '$src/state/viewState'
import { FileState } from '$src/state/fileState'

export interface WindowSettings {
    splitView: boolean
}

export class WinState {
    splitView = false

    static id = 0

    id = 0
    // two views per window now
    // we'll need to extend it if we decide
    // to have multiple windows (which may or may not
    // have several views)
    views: ViewState[] = observable<ViewState>([])

    constructor(options: WindowSettings) {
        makeObservable(this, {
            splitView: observable,
            toggleSplitViewMode: action,
            toJSON: computed,
            initState: action,
            setActiveView: action,
        })

        this.id = WinState.id++
        this.splitView = !!options.splitView
        console.log('WinState', this.id, WinState.id)
    }

    toggleSplitViewMode(): void {
        this.splitView = !this.splitView

        // FIXME: when deleting view, the one on the right is removed
        // this could change
        if (!this.splitView) {
            // first remove the view
            this.removeView(1)
            this.setActiveView(0)
        } else {
            this.getOrCreateView(1)
            this.setActiveView(1)
        }

        // send new value to main process
        console.log('calling setWindowSettings', this.toJSON)
        ipcRenderer.invoke('setWindowSettings', this.toJSON)
    }

    get toJSON() {
        return {
            settings: {
                splitView: this.splitView,
            },
        }
    }

    /**
     * first view is activated, and first tab set to visible
     */
    initState(): void {
        this.views[0].isActive = true
        for (const view of this.views) {
            // get and activate the first cache for now
            view.setVisibleCache(0)
        }
    }

    getOrCreateView(viewId: number): ViewState {
        let view = this.getView(viewId)

        if (!view) {
            view = this.createView(viewId)
            this.views[viewId] = view
        }

        return view
    }

    removeView(viewId: number) {
        const viewToRemove = this.views.splice(viewId, 1)[0]
        viewToRemove.caches.forEach((cache: FileState, index: number) => viewToRemove.removeCache(index))
    }

    /**
     * Changes the active file cache
     *
     * @param active the number of the cache to be the new active one
     */
    setActiveView(viewId: number): void {
        console.log('setting active view', viewId)
        const previous = this.getActiveView()
        const next = this.getView(viewId)

        // if the active view has been removed, previous is undefined
        if (previous) {
            previous.isActive = false
        }
        next.isActive = true
    }

    getActiveView(): ViewState {
        return this.getViewByActive(true)
    }

    getInactiveView(): ViewState {
        return this.getViewByActive(false)
    }

    /**
     * returns active or invactive view
     * @param isActive if set to true returns the active view, otherwise inactive one
     */
    getViewByActive(isActive = true): ViewState {
        return this.views.find((view) => view.isActive === isActive)
    }

    getVisibleViewByPath(path: string): FileState[] {
        return this.views.reduce((states: FileState[], view: ViewState) => {
            const cache = view.getVisibleCache()
            if (cache?.path === path && cache?.getFS().options.needsRefresh) {
                states.push(cache)
            }
            return states
        }, [])
    }

    getView(viewId: number): ViewState {
        return this.views.find((view) => view.viewId === viewId)
    }

    createView(viewId: number): ViewState {
        return new ViewState(viewId)
    }
}

import { IpcRendererEvent } from 'electron/renderer'

export type IpcRendererEventHandler = (event: IpcRendererEvent, command: string, param?: string) => void

/**
 * Describes a view, the path is the path to its first tab: right now each view is created with only
 * one tab: this may change in the future
 */
export interface ViewDescriptor {
    viewId: number
    path: string
}

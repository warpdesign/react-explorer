import { FileDescriptor } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { IconName } from '@blueprintjs/icons'
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

export interface FileViewItem {
    name: string
    icon: IconName
    size: string
    isSelected: boolean
    nodeData: FileDescriptor
    className: string
    title: string
}

export interface DraggedObject {
    selectedCount: number
    fileState?: FileState
    dragFiles?: FileDescriptor[]
}

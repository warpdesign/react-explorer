import { FileDescriptor } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { IconName } from '@blueprintjs/icons'
import { IpcRendererEvent } from 'electron/renderer'

export type IpcRendererEventHandler<C, P = string> = (event: IpcRendererEvent, command: C, param?: P) => void

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
    isEditing: boolean
    nodeData: FileDescriptor
    className: string
    title: string
}

export interface DraggedObject {
    fileState?: FileState
    dragFiles?: FileDescriptor[]
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

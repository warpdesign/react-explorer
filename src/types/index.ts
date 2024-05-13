import { ViewModeName } from '$src/hooks/useViewMode'
import { FileDescriptor } from '$src/services/Fs'
import { FileState, TStatus } from '$src/state/fileState'
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

// Properties that trigger an update of native menus
export interface ReactiveProperties {
    activeViewTabNums: number
    isReadonly: boolean
    isIndirect: boolean
    isOverlayOpen: boolean
    isExplorer: boolean
    isRoot: boolean
    historyLength: number
    historyCurrent: number
    activeViewId: number
    path: string
    selectedLength: number
    clipboardLength: number
    filesLength: number
    status: TStatus
    language: string
    viewMode: ViewModeName
}

export type KeyboardLayoutMap = Record<string, string>

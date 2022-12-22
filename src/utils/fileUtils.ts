import { TypeIcons } from '$src/constants/icons'
import { Extensions, FileDescriptor } from '$src/services/Fs'
import { FileViewItem } from '$src/types'
import classNames from 'classnames'
import { formatBytes } from './formatBytes'

export const REGEX_EXTENSION = /\.(?=[^0-9])/

export interface SelectionRange {
    start: number
    end: number
}

export function getExtensionIndex(filename: string): number {
    let index = -1
    for (const ext of Object.keys(Extensions)) {
        const matches = filename.match(Extensions[ext])
        if (matches && (index === -1 || matches.index < index)) {
            index = matches.index
        }
    }

    return index
}

export function getSelectionRange(filename: string): SelectionRange {
    const length = filename.length

    if (filename.startsWith('.')) {
        return {
            start: 1,
            end: length,
        }
    } else {
        const index = getExtensionIndex(filename)
        if (index > -1) {
            return {
                start: 0,
                end: index,
            }
        } else {
            return {
                start: 0,
                end: length,
            }
        }
    }
}

export function filterDirs(files: FileDescriptor[]): FileDescriptor[] {
    return files.filter(({ isDir, fullname }) => isDir)
}

export function filterFiles(files: FileDescriptor[]): FileDescriptor[] {
    return files.filter(({ isDir, fullname }) => !isDir)
}

export function filterHiddenFiles(files: FileDescriptor[]) {
    return files.filter(({ fullname }: FileDescriptor) => !fullname.startsWith('.'))
}

export function buildNodeFromFile(file: FileDescriptor, isSelected: boolean): FileViewItem {
    const filetype = file.type
    const classes = classNames({
        isHidden: file.fullname.startsWith('.'),
        isSymlink: file.isSym,
    })

    const res: FileViewItem = {
        icon: (file.isDir && TypeIcons['dir']) || (filetype && TypeIcons[filetype]) || TypeIcons['any'],
        name: file.fullname,
        title: file.isSym ? `${file.fullname} → ${file.target}` : file.fullname,
        nodeData: file,
        className: classes,
        isSelected: !!isSelected,
        size: (!file.isDir && formatBytes(file.length)) || '--',
    }

    return res
}

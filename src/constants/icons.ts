import { IconName } from '@blueprintjs/core'

import { ALL_DIRS } from '$src/utils/platform'
import {
    Icon,
    IconCameraFilled,
    IconDeviceImac,
    IconDownload,
    IconFile,
    IconFileCode,
    IconFileDigit,
    IconFileText,
    IconFileZip,
    IconFolder,
    IconHomeFilled,
    IconMusic,
    IconPhoto,
    IconProps,
    IconVideoFilled,
} from '@tabler/icons-react'

/**
 * blueprint icon name for user home folders
 */
export const UserHomeIcons: { [index: string]: IconName } = {
    DOWNLOADS_DIR: 'download',
    MUSIC_DIR: 'music',
    PICTURES_DIR: 'camera',
    DESKTOP_DIR: 'desktop',
    DOCS_DIR: 'projects',
    HOME_DIR: 'home',
    VIDEOS_DIR: 'video',
}

export const UserHomeIconsTabler: {
    [index: string]: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Icon>>
} = {
    DOWNLOADS_DIR: IconDownload,
    MUSIC_DIR: IconMusic,
    PICTURES_DIR: IconCameraFilled,
    DESKTOP_DIR: IconDeviceImac,
    DOCS_DIR: IconFileText,
    HOME_DIR: IconHomeFilled,
    VIDEOS_DIR: IconVideoFilled,
}

export const TypeIcons: { [key: string]: IconName } = {
    img: 'media',
    any: 'document',
    snd: 'music',
    vid: 'mobile-video',
    exe: 'application',
    arc: 'compressed',
    doc: 'align-left',
    cod: 'code',
    dir: 'folder-close',
}

export const TypeIconsTabler: {
    [key: string]: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Icon>>
} = {
    img: IconPhoto,
    any: IconFile,
    snd: IconMusic,
    vid: IconVideoFilled,
    exe: IconFileDigit,
    arc: IconFileZip,
    doc: IconFileText,
    cod: IconFileCode,
    dir: IconFolder,
}

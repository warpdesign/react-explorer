import { IconName } from '@blueprintjs/core'

import { ALL_DIRS } from '$src/utils/platform'

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

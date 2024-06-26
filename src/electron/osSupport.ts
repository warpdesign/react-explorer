import { platform } from 'process'
import { release, arch, userInfo } from 'os'
import { app } from 'electron'

type App = { getPath: (name: string) => string } | Electron.App

function getAppInstance(): App {
    let appInstance: App = app

    if (!appInstance) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const getPath: (name: string) => string = require('./test/helpers').getPath
        // simulate getPath for test environment
        appInstance = {
            getPath,
        }
    }

    return appInstance
}

const appInstance = getAppInstance()

function getDefaultFolder() {
    let defaultFolder = ''

    if (typeof jest !== 'undefined') {
        defaultFolder = ''
    } else {
        defaultFolder =
            window.ENV.NODE_ENV === 'production'
                ? appInstance.getPath('home')
                : platform === 'win32'
                ? appInstance.getPath('temp')
                : '/tmp/react-explorer'
    }

    return defaultFolder
}

export const isMac = platform === 'darwin'
export const isMojave = isMac && parseInt(release().split('.')[0], 10) - 4 >= 14
export const isWin = platform === 'win32'
export const isLinux = platform === 'linux'
export const optionKey = (isMac && 'Alt') || 'Control'
export const lineEnding = isWin ? '\r\n' : '\n'
// depends on appInstance
export const defaultFolder = getDefaultFolder()
export const TMP_DIR = appInstance.getPath('temp')
export const HOME_DIR = appInstance.getPath('home')
export const DOWNLOADS_DIR = appInstance.getPath('downloads')
export const MUSIC_DIR = appInstance.getPath('music')
export const DOCS_DIR = appInstance.getPath('documents')
export const DESKTOP_DIR = appInstance.getPath('desktop')
export const PICTURES_DIR = appInstance.getPath('pictures')
export const VIDEOS_DIR = appInstance.getPath('videos')
export const ALL_DIRS: Record<string, string> = {
    HOME_DIR,
    DOWNLOADS_DIR,
    PICTURES_DIR,
    MUSIC_DIR,
    DOCS_DIR,
    DESKTOP_DIR,
    VIDEOS_DIR,
}
export const USERNAME = userInfo().username || 'username'
export const VERSIONS = {
    platform,
    release: release(),
    arch: arch(),
    electron: process.versions['electron'],
    chrome: process.versions['chrome'],
    node: process.version,
}

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

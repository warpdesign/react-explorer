import { ACCELERATOR_EVENT } from '$src/utils/keyboard'
import useIpcRendererListener from './useIpcRendererListener'

interface Command {
    combo: string
}

interface comboAccelerator {
    combo: string
    callback: (combo: string, param?: any) => void
}

export const useMenuAccelerator = (accelerators: comboAccelerator[]) => {
    useIpcRendererListener<Command>(ACCELERATOR_EVENT, (event, { combo }, param) => {
        const accelerator = accelerators.find((accelerator) => accelerator.combo === combo)
        accelerator && accelerator.callback(combo, param)
    })
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { observer } from 'mobx-react'
import {
    InputGroup,
    ControlGroup,
    Button,
    ButtonGroup,
    Intent,
    Position,
    HotkeysTarget2,
    Classes,
} from '@blueprintjs/core'
import { Popover2 } from '@blueprintjs/popover2'
import { useTranslation } from 'react-i18next'

import { FileMenu } from '$src/components/FileMenu'
import { MakedirDialog } from '$src/components/dialogs/MakedirDialog'
import { AppAlert } from '$src/components/AppAlert'
import { Logger } from '$src/components/Log'
import { AppToaster } from '$src/components/AppToaster'
import { LocalizedError } from '$src/locale/error'
import Keys from '$src/constants/keys'
import { useStores } from '$src/hooks/useStores'
import { useMenuAccelerator } from '$src/hooks/useAccelerator'

const ERROR_MESSAGE_TIMEOUT = 3500

interface Props {
    onPaste: () => void
    active: boolean
}

export const Toolbar = observer(({ onPaste, active }: Props) => {
    const { appState, viewState } = useStores('appState', 'viewState')
    const [isMakedirDialogOpen, setIsMakedirDialogOpen] = useState(false)
    const cache = viewState.getVisibleCache()
    const { selected, history, current } = cache
    const [path, setPath] = useState('')
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)

    useMenuAccelerator([
        {
            combo: 'CmdOrCtrl+N',
            callback: useCallback(() => onMakedir(), [cache]),
        },
        {
            combo: 'CmdOrCtrl+D',
            callback: useCallback(() => onDelete(), [cache]),
        },
    ])

    useEffect(() => {
        setPath(cache.path)
    }, [cache.path])

    const onBackward = () => cache.navHistory(-1)

    const onForward = () => cache.navHistory(1)

    const onPathChange = (event: React.FormEvent<HTMLElement>): void => {
        setPath((event.target as HTMLInputElement).value)
    }

    const onSubmit = async (): Promise<void> => {
        if (cache.path !== path) {
            try {
                await cache.cd(path)
                inputRef.current.blur()
            } catch (e) {
                const err = e as LocalizedError
                await AppAlert.show(`${err.message} (${err.code})`, {
                    intent: 'danger',
                })
                inputRef.current.select()
            }
        }
    }

    const onKeyUp = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key === Keys.ESCAPE) {
            // since React events are attached to the root document
            // event already has bubbled up so we must stop
            // its immediate propagation
            event.nativeEvent.stopImmediatePropagation()
            // lose focus
            inputRef.current.blur()
        } else if (event.key === Keys.ENTER) {
            onSubmit()
        }
    }

    const onBlur = (): void => {
        // restore previous valid cache unless an error alert has been displayed:
        // this will cause the input to loose focus but we don't want to update the path
        // in that particular case
        if (cache.path !== path && !document.body.classList.contains(Classes.OVERLAY_OPEN)) {
            setPath(cache.path)
        }
    }

    const onReload = (): void => cache.reload()

    const makedir = async (dirName: string, navigate: boolean): Promise<void> => {
        setIsMakedirDialogOpen(false)

        if (!dirName.length) {
            return
        }

        try {
            Logger.log("Let's create a directory :)", dirName, navigate)
            const dir = await cache.makedir(path, dirName)

            if (!navigate) {
                cache.reload()
            } else {
                cache.cd(dir as string)
            }
        } catch (err) {
            AppToaster.show({
                message: t('ERRORS.CREATE_FOLDER', { message: err.message }),
                icon: 'error',
                intent: Intent.DANGER,
                timeout: ERROR_MESSAGE_TIMEOUT,
            })
        }
    }

    const onMakedir = (): void => {
        const fileCache = appState.getActiveCache()

        if (fileCache === cache && !fileCache.error) {
            setIsMakedirDialogOpen(true)
        }
    }

    const onDelete = (): void => {
        if (appState.getActiveCache() === cache) {
            appState.delete()
        }
    }

    const onFileAction = (action: string): void => {
        switch (action) {
            case 'makedir':
                Logger.log('Opening new folder dialog')
                onMakedir()
                break

            case 'delete':
                onDelete()
                break

            case 'paste':
                onPaste()
                break

            default:
                Logger.warn('action unknown', action)
        }
    }

    const onFocus = (): void => inputRef.current.select()

    const onParent = (): void => cache.openParentDirectory()

    const hotkeys = [
        {
            global: true,
            combo: 'mod+l',
            label: t('SHORTCUT.ACTIVE_VIEW.FOCUS_PATH'),
            onKeyDown: () => inputRef.current.focus(),
            group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        },
    ]
    const canGoBackward = current > 0
    const canGoForward = history.length > 1 && current < history.length - 1
    const reloadButton = (
        <Button className="small data-cy-reload" onClick={onReload} minimal rightIcon="repeat"></Button>
    )

    return (
        <HotkeysTarget2 hotkeys={hotkeys}>
            <ControlGroup className="toolbar">
                <ButtonGroup>
                    <Button
                        title={t('TOOLBAR.BACK')}
                        data-cy-backward
                        disabled={!canGoBackward}
                        onClick={onBackward}
                        rightIcon="chevron-left"
                    ></Button>
                    <Button
                        title={t('TOOLBAR.FORWARD')}
                        data-cy-forward
                        disabled={!canGoForward}
                        onClick={onForward}
                        rightIcon="chevron-right"
                    ></Button>
                    <Button
                        title={t('TOOLBAR.PARENT')}
                        disabled={cache.isRoot()}
                        onClick={onParent}
                        rightIcon="arrow-up"
                    ></Button>

                    <Popover2
                        content={
                            <FileMenu
                                isDisabled={!cache || cache.error}
                                selectedItemsLength={selected.length}
                                onFileAction={onFileAction}
                            />
                        }
                    >
                        <Button rightIcon="caret-down" icon="cog" />
                    </Popover2>
                </ButtonGroup>
                <InputGroup
                    data-cy-path
                    onChange={onPathChange}
                    onKeyUp={onKeyUp}
                    placeholder={t('COMMON.PATH_PLACEHOLDER')}
                    rightElement={reloadButton}
                    value={path}
                    inputRef={inputRef}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    disabled={!active}
                />
                {isMakedirDialogOpen && (
                    <MakedirDialog
                        isOpen={true}
                        onClose={makedir}
                        onValidation={cache.isDirectoryNameValid}
                        parentPath={path}
                    ></MakedirDialog>
                )}

                <Button rightIcon="arrow-right" className="data-cy-submit-path" onClick={onSubmit} />
            </ControlGroup>
        </HotkeysTarget2>
    )
})

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { observer } from 'mobx-react'
import { InputGroup, ControlGroup, Button, ButtonGroup, Intent, HotkeysTarget2, Classes } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Popover2 } from '@blueprintjs/popover2'
import { useTranslation } from 'react-i18next'

import { FileMenu } from '$src/components/FileMenu'
import { MakedirDialog } from '$src/components/dialogs/MakedirDialog'
import { ApplyTagsDialog } from '$src/components/dialogs/ApplyTagsDialog'
import { AppAlert } from '$src/components/AppAlert'
import { AppToaster } from '$src/components/AppToaster'
import { LocalizedError } from '$src/locale/error'
import Keys from '$src/constants/keys'
import { useStores } from '$src/hooks/useStores'
import { useMenuAccelerator } from '$src/hooks/useAccelerator'
import { SortMenuToggle, ViewToggle } from './components'
import { TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'
import { ipcRenderer } from 'electron'

const ERROR_MESSAGE_TIMEOUT = 3500

interface Props {
    active: boolean
}

export const Toolbar = observer(({ active }: Props) => {
    const { appState, viewState } = useStores('appState', 'viewState')
    const [isMakedirDialogOpen, setIsMakedirDialogOpen] = useState(false)
    const [isApplyTagsDialogOpen, setIsApplyTagsDialogOpen] = useState(false)
    const cache = viewState.getVisibleCache()
    const { selected, history, current, viewmode, sortMethod, sortOrder } = cache
    const [path, setPath] = useState('')
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>()
    const submitButtonRef = useRef<HTMLButtonElement>()

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

    const onSubmit = async (shouldSelectTextOnError = false): Promise<void> => {
        if (cache.path !== path) {
            try {
                await cache.cd(path)
                inputRef.current.blur()
            } catch (e) {
                const err = e as LocalizedError
                await AppAlert.show(`${err.message} (${err.code})`, {
                    intent: 'danger',
                })

                // If path was submitted by pressing enter
                // it means the input still has focus: in this
                // case we re-select the (wrong) path to let the user
                // fix it.
                if (shouldSelectTextOnError) {
                    inputRef.current.select()
                } else {
                    // if the user clicked on the submit button it means
                    // the input lost focus: in this case we reset the value
                    // to the current cache path.
                    setPath(cache.path)
                }
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
            onSubmit(true)
        }
    }

    const onBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
        const didClickOnSubmit = e.relatedTarget === submitButtonRef.current
        // restore previous valid cache unless an error alert has been displayed:
        // this will cause the input to loose focus but we don't want to update the path
        // in that particular case
        if (!didClickOnSubmit && cache.path !== path && !document.body.classList.contains(Classes.OVERLAY_OPEN)) {
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
            console.log("Let's create a directory :)", dirName, navigate)
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
    const onApplyTags = (tags: any[]) => {
        setIsApplyTagsDialogOpen(false)
        const selectedFiles = selected.map((file) => [file.dir, file.name, file.extension].join('/'))
        const tagNames = tags.map((it: any) => it.value)
        const fileNames = selectedFiles
        //.map((it:any)=>it.value)
        ipcRenderer.invoke('apply-tags', { fileNames, tagNames })
    }

    const onFileAction = (action: string): void => {
        switch (action) {
            case 'applytags':
                if (appState.getActiveCache() === cache) {
                    setIsApplyTagsDialogOpen(true)
                }
                break
            case 'makedir':
                console.log('Opening new folder dialog')
                onMakedir()
                break

            case 'delete':
                onDelete()
                break

            case 'paste':
                appState.paste(cache)
                break

            default:
                console.warn('action unknown', action)
        }
    }

    const onFocus = (): void => inputRef.current.select()

    const onParent = (): void => cache.openParentDirectory()

    const onSortChange = (newSortMethod: TSORT_METHOD_NAME, newSortOrder: TSORT_ORDER) => {
        if (newSortMethod !== sortMethod || sortOrder !== newSortOrder) {
            cache.setSort(newSortMethod, newSortOrder)
        }
    }

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
                        rightIcon="chevron-up"
                    ></Button>

                    <ViewToggle viewmode={viewmode} onClick={(newViewMode) => cache.setViewMode(newViewMode)} />
                    <SortMenuToggle sortMethod={sortMethod} sortOrder={sortOrder} onClick={onSortChange} />
                    <Popover2
                        content={
                            <FileMenu
                                isDisabled={!cache || cache.error}
                                selectedItemsLength={selected.length}
                                onFileAction={onFileAction}
                            />
                        }
                        placement="bottom-start"
                    >
                        <Button rightIcon="caret-down" icon={IconNames.FOLDER_NEW} />
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
                    // allows input shrinking to a very low width:
                    // without it, it would refuse shrinking below 100px
                    size={1}
                />
                {isMakedirDialogOpen && (
                    <MakedirDialog
                        isOpen={true}
                        onClose={makedir}
                        onValidation={cache.isDirectoryNameValid}
                        parentPath={path}
                    ></MakedirDialog>
                )}
                {isApplyTagsDialogOpen && (
                    <ApplyTagsDialog
                        isOpen={true}
                        onApplyTags={onApplyTags}
                        onClose={() => setIsApplyTagsDialogOpen(false)}
                        // onValidation={(tags) => true} // Provide a validation function if needed
                    />
                )}

                <Button
                    rightIcon="arrow-right"
                    className="data-cy-submit-path"
                    onClick={() => onSubmit()}
                    elementRef={submitButtonRef}
                />
            </ControlGroup>
        </HotkeysTarget2>
    )
})

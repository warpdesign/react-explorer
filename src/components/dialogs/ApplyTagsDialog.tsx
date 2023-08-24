import React, { useEffect, useState } from 'react'
import { ipcRenderer } from 'electron'
import { Dialog, Classes, Intent, Button } from '@blueprintjs/core'
import Select from 'react-select'
import Creatable from 'react-select/creatable'

interface ApplyTagsProps {
    isOpen: boolean
    onClose?: () => void
    onApplyTags?: (tags: any[]) => void // Renamed this prop
}

const ApplyTagsDialog = ({ isOpen, onClose, onApplyTags }: ApplyTagsProps) => {
    const [inputValue, setInputValue] = useState('')
    const [selectedTags, setSelectedTags] = useState([])
    const [tagOptions, setTagOptions] = useState([])

    const loadTags = async (inputValue: string) => {
        // Query the tags via IPC call
        const response = await ipcRenderer.invoke('list-tags', inputValue)
        setTagOptions(
            response.map((it: string) => {
                return { value: it, label: it }
            }),
        )
    }

    const onInputChange = (inputValue: string) => {
        setInputValue(inputValue)
        loadTags(inputValue)
    }

    const onCancel = (): void => onClose && onClose()

    const handleApply = (): void => {
        // Pass the selected tags to the parent component
        onApplyTags && onApplyTags(selectedTags)
        onClose && onClose()
    }

    const onChange = (selectedOptions: any) => setSelectedTags(selectedOptions)

    return (
        <Dialog
            icon="tag"
            title="Apply Tags"
            isOpen={isOpen}
            autoFocus
            enforceFocus
            canEscapeKeyClose
            usePortal
            onClose={onCancel}
        >
            <div className={Classes.DIALOG_BODY}>
                <Creatable
                    isMulti
                    value={selectedTags}
                    options={tagOptions}
                    onInputChange={onInputChange}
                    onChange={onChange}
                    placeholder="Select or create tags..."
                />
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button intent={Intent.PRIMARY} onClick={handleApply} disabled={!selectedTags.length}>
                        Apply
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export { ApplyTagsDialog }

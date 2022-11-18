import * as React from 'react'
import { observer, inject } from 'mobx-react'
import { InputGroup, ControlGroup, Button, Intent, IconName } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import { AppState } from '../state/appState'
import { withTranslation, WithTranslation } from 'react-i18next'
import classnames from 'classnames'
import { ViewState } from '../state/viewState'

interface InjectedProps extends WithTranslation {
    viewState: ViewState
    appState: AppState
}

export const StatusbarClass = inject(
    'viewState',
    'appState',
)(
    observer(
        class StatusbarClass extends React.Component<WithTranslation> {
            constructor(props: WithTranslation) {
                super(props)
            }

            private get injected(): InjectedProps {
                return this.props as InjectedProps
            }

            private onClipboardCopy = (): void => {
                const { appState, viewState } = this.injected
                appState.clipboard.setClipboard(viewState.getVisibleCache())
            }

            public render(): React.ReactNode {
                const { viewState } = this.injected
                const fileCache = viewState.getVisibleCache()
                const disabled = !fileCache.selected.length
                const numDirs = fileCache.files.filter((file) => file.fullname !== '..' && file.isDir).length
                const numFiles = fileCache.files.filter((file) => !file.isDir).length
                const numSelected = fileCache.selected.length
                const iconName = ((fileCache.getFS() && fileCache.getFS().icon) || 'offline') as IconName
                const offline = classnames('status-bar', { offline: fileCache.status === 'offline' })
                const { t } = this.props

                const copyButton = (
                    <Tooltip2 content={t('STATUS.CPTOOLTIP', { count: numSelected })} disabled={disabled}>
                        <Button
                            data-cy-paste-bt
                            disabled={disabled}
                            icon="clipboard"
                            intent={(!disabled && Intent.PRIMARY) || Intent.NONE}
                            onClick={this.onClipboardCopy}
                            minimal={true}
                        />
                    </Tooltip2>
                )

                return (
                    <ControlGroup>
                        <InputGroup
                            disabled
                            leftIcon={iconName}
                            rightElement={copyButton}
                            value={`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                                count: numDirs,
                            })}`}
                            className={offline}
                        />
                    </ControlGroup>
                )
            }
        },
    ),
)

const Statusbar = withTranslation()(StatusbarClass)

export { Statusbar }

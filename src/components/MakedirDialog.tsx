import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup } from "@blueprintjs/core";

interface IMakedirProps {
    isOpen: boolean;
    onClose?: (dirName: string) => void
};

interface IMakedirState {
    path: string;
}

export class MakedirDialog extends React.Component<IMakedirProps, IMakedirState>{
    constructor(props:any) {
        super(props);

        this.state = {
            path: 'dtc'
        };
    }

    private cancelClose = () => {
        console.log('handleClose');        
        this.props.onClose("");
    }

    private onClose = () => {
        console.log('onCloseMakerdirDialog');
        this.props.onClose(this.state.path);
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // // 2. isValid ? => loadDirectory
        // this.checkPath(event);
    }

    public render() {
        const { path } = this.state;

        return(
            <Dialog
            icon="folder-new"
            title="New Directory"
            isOpen={this.props.isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={this.cancelClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <p>Enter a name to create a new directory:</p>
                <FormGroup
                    helperText="Helper text with details..."
                    inline={true}
                    labelFor="directory-input"
                    labelInfo="/mnt/c/"
                >                
                    <InputGroup
                        onChange={this.onPathChange}
                        placeholder="Enter directory name"
                        value={path}
                        id="directory-input"
                        name="directory-input"
                    />
                </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={this.cancelClose}>Cancel</Button>

                    <Button intent={Intent.PRIMARY} onClick={this.onClose} disabled={!path.length}>
                        Create
                    </Button>
                </div>
            </div>            
            </Dialog>
        )
    }
}
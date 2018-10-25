import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, Label, Checkbox } from "@blueprintjs/core";
import { debounce } from "../utils/debounce";
import { Fs } from "../services/Fs";
import { sep as separator } from 'path';

interface IMakedirProps {
    isOpen: boolean;
    parentPath: string;
    onClose?: (dirName: string, navigate: boolean) => void
};

interface IMakedirState {
    path: string;
    ctrlKey: boolean;
    valid: boolean;
}

const DEBOUNCE_DELAY = 300;
const CTRL_KEY = 17;

export class MakedirDialog extends React.Component<IMakedirProps, IMakedirState>{
    constructor(props:any) {
        super(props);

        this.state = {
            path: '',
            ctrlKey: false,
            valid: true
        };
    }

    onKeyUp = (e: KeyboardEvent) => {
        if (e.keyCode === CTRL_KEY) {
            this.setState({ ctrlKey: false });
        }
    }

    onKeyDown = (e: KeyboardEvent) => {
        if (e.keyCode === CTRL_KEY) {
            this.setState({ ctrlKey: true });
        }
    }

    private isValid(path: string): boolean {
        return Fs.isDirectoryNameValid(path);
    }

    private checkPath: (event: React.FormEvent<HTMLElement>) => any = debounce(
        async (event: React.FormEvent<HTMLElement>) => {
            try {
                const isValid = this.isValid(this.state.path);
                this.setState({ valid: isValid });
            } catch {
                this.setState({ valid: false });
            }
        }, DEBOUNCE_DELAY);

    private cancelClose = () => {
        console.log('handleClose');        
        this.props.onClose("", false);
    }

    private onCreate = () => {
        console.log('onCloseMakerdirDialog');
        const { path, ctrlKey } = this.state;
        if (this.isValid(path)) {
            this.props.onClose(path, ctrlKey);
        } else {
            this.setState({ valid: false });            
        }
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // // 2. isValid ?
        this.checkPath(event);
    }

    // private onCheckChange = () => {
    //     this.setState({ isChecked: !this.state.isChecked });
    // }

    componentWillMount() {
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('keydown', this.onKeyDown);        
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('keydown', this.onKeyDown);        
    }

    public render() {
        const { path, valid, ctrlKey } = this.state;
        const intent = !valid && 'danger' || 'none';

        return(
            <Dialog
            icon="folder-new"
            title="New Folder"
            isOpen={this.props.isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={this.cancelClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <p>Enter a name to create a new folder:</p>
                <FormGroup
                    helperText={"aa"/*<Checkbox checked={this.state.isChecked} label="Navigate to the new folder" onChange={this.onCheckChange} />*/}
                    inline={true}
                    labelFor="directory-input"
                    labelInfo={`${this.props.parentPath}${separator}`}
                >                
                    <InputGroup
                        onChange={this.onPathChange}
                        placeholder="Enter folder name"
                        value={path}
                        id="directory-input"
                        name="directory-input"
                        intent={intent}
                    />
                </FormGroup>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={this.cancelClose}>Cancel</Button>

                    <Button intent={Intent.PRIMARY} onClick={this.onCreate} disabled={!path.length || !valid}>
                        {!ctrlKey && 'Create' || 'Create & read folder'}
                    </Button>
                </div>
            </div>            
            </Dialog>
        )
    }
}
import * as React from "react";
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, Label, Checkbox } from "@blueprintjs/core";
import { debounce } from "../utils/debounce";
import { sep as separator } from 'path';

interface IMakedirProps {
    isOpen: boolean;
    parentPath: string;
    onClose?: (dirName: string, navigate: boolean) => void
    onValidation: (dir: string) => boolean
};

interface IMakedirState {
    path: string;
    ctrlKey: boolean;
    valid: boolean;
}

const DEBOUNCE_DELAY = 300;
const CTRL_KEY = 17;
const ENTER_KEY = 13;
const META_KEY = 91;
const ReadFolderKey = process.platform === 'darwin' && META_KEY || CTRL_KEY;

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
        if (e.keyCode === ReadFolderKey) {
            this.setState({ ctrlKey: false });
        } else if (e.keyCode === ENTER_KEY) {
            this.onCreate();
        }
    }

    onKeyDown = (e: KeyboardEvent) => {
        if (e.keyCode === ReadFolderKey) {
            this.setState({ ctrlKey: true });
        }
    }

    private isValid(path: string): boolean {
        const valid = this.props.onValidation(path);
        console.log('valid', path, valid);
        return valid;
    }

    private checkPath: (path: string) => any = debounce(
        (path: string) => {
            try {
                const isValid = this.isValid(path);
                this.setState({ valid: isValid });
            } catch(error) {
                console.log('error', error);
                this.setState({ valid: false });
            }
        }, DEBOUNCE_DELAY);

    private cancelClose = () => {
        console.log('handleClose');
        this.props.onClose("", false);
    }

    private onCreate = () => {
        console.log('onCreate');
        const { path, ctrlKey } = this.state;
        if (this.isValid(path)) {
            this.props.onClose(path, ctrlKey);
        } else {
            this.setState({ valid: false });
        }
    }

    private onPathChange = (event: React.FormEvent<HTMLElement>) => {
        console.log('path change');
        // 1.Update date
        const path = (event.target as HTMLInputElement).value;
        this.setState({ path });
        // // 2. isValid ?
        this.checkPath(path);
    }

    componentDidMount() {
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
        const helperText = !valid && (<span>Folder name not valid</span>) || (<span>&nbsp;</span>);

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
                    helperText={helperText}
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
                        autoFocus
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
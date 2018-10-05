import * as React from "react";
import * as ReactDOM from "react-dom";

import { observable } from 'mobx';
import { observer } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

const css = require("@blueprintjs/core/lib/css/blueprint.css");
const bcss = require("@blueprintjs/icons/lib/css/blueprint-icons.css");

import { Button, Intent, InputGroup, Spinner } from "@blueprintjs/core";

import { FileList } from './components/FileList';
import { SideView } from './components/SideView';

import { Fs } from './services/Fs';

class AppState {
    @observable timer = 0;

    constructor() {
        setInterval(() => {
            this.timer += 1;
        }, 1000);
    }

    resetTimer() {
        this.timer = 0;
    }
}

@observer
class TimerView extends React.Component<{ appState: AppState }, {}> {
    render() {
        return (
            <div>
                <button onClick={this.onReset}>
                    Seconds passed: {this.props.appState.timer}
                </button>
                <DevTools />
            </div>
        );
    }

    onReset = () => {
        this.props.appState.resetTimer();
        Fs.readDirectory('.').then((files) => console.log('yeah, got files', files));
    }
};

/*
const appState = new AppState();
ReactDOM.render(<TimerView appState={appState} />, document.getElementById('root'));
*/
ReactDOM.render(<SideView />, document.getElementById('root'));

const button = React.createElement(Button, {
    icon: "cloud",
    text: "CDN Blueprint is go!",
});


// ReactDOM.render(<FileList/>, document.querySelector("#btn"));


// import { Hello } from "./components/Hello";

// ReactDOM.render(
//     <Hello compiler="TypeScript" framework="React" />,
//     document.getElementById("root")
// );
import { observable } from 'mobx';
import { Cache } from '../services/Fs';

export class AppState {
    @observable localCache: Cache = {
        path: '.',
        files: new Array()
    };

    @observable remoteCache: Cache = {
        path: 'ftp://192.168.0.1',
        files: new Array()
    };

    test() {
        console.log('**click!!');
        this.localCache.path = '** dtc !!';
    }

    setFiles(remote: boolean, files: Array<any>) {
        if (remote) {
            this.remoteCache.files = files;
        } else {
            this.localCache.files = files;
        }
    }

    constructor() {
        // TODO: get initial path values ?
    }
}

// @observer
// class TimerView extends React.Component<{ appState: AppState }, {}> {
//     render() {
//         return (
//             <div>
//             <button onClick= { this.onReset } >
//             Seconds passed: { this.props.appState.timer }
//         </button>
//             < DevTools />
//             </div>
//         );
//     }

//     onReset = () => {
//         this.props.appState.resetTimer();
//         Fs.readDirectory('.').then((files) => console.log('yeah, got files', files));
//     }
// };
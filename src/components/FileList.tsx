import * as React from "react";
import { observer } from 'mobx-react';
import { Classes, Icon, ITreeNode, Tooltip, Tree } from "@blueprintjs/core";
import { autorun } from "mobx";

export interface ITreeExampleState {
    nodes: ITreeNode[];
    path: string
};

const INITIAL_STATE: ITreeNode[] = [
    {
        id: 0,
        icon: "folder-close",
        label: "Folder 0",
    },
    {
        id: 1,
        icon: "folder-close",
        // isExpanded: true,
        label: <Tooltip content="I'm a folder <3">Folder 1</Tooltip>,
        // childNodes: [
        //     {
        //         id: 2,
        //         icon: "document",
        //         label: "Item 0"
        //         // secondaryLabel: (
        //         //     <Tooltip content="An eye!">
        //         //         <Icon icon="eye-open" />
        //         //     </Tooltip>
        //         // ),
        //     },
        //     {
        //         id: 3,
        //         icon: "tag",
        //         label: "Organic meditation gluten-free, sriracha VHS drinking vinegar beard man."
        //     },
        //     {
        //         id: 4,
        //         hasCaret: true,
        //         icon: "folder-close",
        //         label: <Tooltip content="foo">Folder 2</Tooltip>,
        //         childNodes: [
        //             { id: 5, label: "No-Icon Item" },
        //             { id: 6, icon: "tag", label: "Item 1" },
        //             {
        //                 id: 7,
        //                 hasCaret: true,
        //                 icon: "folder-close",
        //                 label: "Folder 3",
        //                 childNodes: [
        //                     { id: 8, icon: "document", label: "Item 0" },
        //                     { id: 9, icon: "tag", label: "Item 1" }
        //                 ]
        //             }
        //         ]
        //     }
        // ]
    },
    { id: 3, icon: "document", label: "Item 1" },
];

@observer export class FileList extends React.Component<any, ITreeExampleState> {
    constructor(props: any) {
        super(props);
    }

    buildNodes(files: Array<any>): ITreeNode<{}>[] {
        const fileList = files
            .sort((file1, file2) => {
                if (file2.isDir && !file1.isDir) {
                    return 1;
                } else if (file1.isDir && !file2.isDir) {
                    return -1;
                } else {
                    return file1.fullname.localeCompare(file2.fullname);
                }
            })
            .map((file, i) => {
                const res: ITreeNode = {
                    id: i,
                    icon: file.isDir && "folder-close" || 'document',
                    label: file.fullname
                };
            return res;
        });

        return fileList;
    }

    public render() {
        return <Tree
            contents={this.buildNodes(this.props.files)}
            className={Classes.ELEVATION_0}
        />;
    }
}
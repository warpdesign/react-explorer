import { Toaster, Position, Intent } from "@blueprintjs/core";
import { IconName } from "@blueprintjs/icons";


const TOAST_TIMEOUT = 2000;

const MyToaster = Toaster.create({
    className: "recipe-toaster",
    position: Position.TOP,
});

export interface IToasterOpts {
    message: string | JSX.Element;
    icon: IconName;
    intent?: Intent;
    timeout?: number
}

export const AppToaster = {
    show: (opts:IToasterOpts, key?:string):string => {
        return MyToaster.show({timeout: TOAST_TIMEOUT, ...opts}, key);
    }
}
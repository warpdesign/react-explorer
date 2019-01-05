import { Toaster, Position, Intent } from "@blueprintjs/core";
import { IconName } from "@blueprintjs/icons";


const TOAST_TIMEOUT = 2000;

const MyToaster = Toaster.create({
    className: "bp3-toaster",
    position: Position.TOP,
});

export interface IToasterOpts {
    message: string | JSX.Element;
    icon: IconName;
    intent?: Intent;
    timeout?: number
}

let lastToast = '';

export const AppToaster = {
    show: (opts: IToasterOpts, key?: string, dismissPrev = false): string => {
        if (dismissPrev) {
            MyToaster.dismiss(lastToast);
        }

        lastToast = MyToaster.show({ timeout: TOAST_TIMEOUT, ...opts }, key);
        return lastToast;
    }
}
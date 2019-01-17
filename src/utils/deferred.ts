export class Deferred<T> {
    public promise: Promise<T>;
    public resolve: (val?: any) => void;
    public reject: (val?: any) => void;
    /**
     * Creates a new Deferred.
     */
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    /**
     * Creates and immediately resolves a new deferred.
     *
     * @param {any} val the value to resolve the promise with
     *
     *
     */
    static resolve(val:any) {
        return Promise.resolve(val);
    }
}

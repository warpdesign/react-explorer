export class Deferred<T> {
    public promise: Promise<T>
    public resolve: (val?: T | PromiseLike<T>) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public reject: (val?: any) => void
    /**
     * Creates a new Deferred.
     */
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }

    /**
     * Creates and immediately resolves a new deferred.
     *
     * @param {any} val the value to resolve the promise with
     *
     *
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static resolve<T>(val: T) {
        return Promise.resolve(val)
    }
}

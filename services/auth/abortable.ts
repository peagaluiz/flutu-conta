const ABORT_ERROR_MESSAGE = "ABORTED_REQUEST";

export function createAbortError(): Error {
    return new Error(ABORT_ERROR_MESSAGE);
}

export function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.message === ABORT_ERROR_MESSAGE;
}

export function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(createAbortError());

    return new Promise<T>((resolve, reject) => {
        const abortHandler = () => reject(createAbortError());
        signal.addEventListener("abort", abortHandler, { once: true });

        promise
            .then((value) => resolve(value))
            .catch((error) => reject(error))
            .finally(() => signal.removeEventListener("abort", abortHandler));
    });
}

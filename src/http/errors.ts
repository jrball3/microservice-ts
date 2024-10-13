export type ErrorResponse = {
    error: string;
    errorName: string;
    errorStack: string;
}

export const toErrorResponse = (error: unknown): ErrorResponse => {
    if (error instanceof Error) {
        return {
            error: error.message,
            errorName: error.constructor.name,
            errorStack: error.stack ?? '',
        };
    }
    return {
        error: 'An unknown error occurred',
        errorName: 'UnknownError',
        errorStack: '',
    };
}

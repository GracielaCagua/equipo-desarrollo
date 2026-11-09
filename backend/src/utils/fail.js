import { HttpError } from './httpError.js';

export const fail = (status, message) => new HttpError(status, message);
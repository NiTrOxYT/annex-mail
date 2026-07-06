import { AppError } from "./errors";

export class Failure<E extends Error = AppError> {
  readonly success = false as const;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }
}

export class Success<T> {
  readonly success = true as const;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }
}

export type Result<T, E extends Error = AppError> = Success<T> | Failure<E>;

export const ok = <T>(value: T): Result<T, never> => new Success(value);
export const fail = <E extends Error>(error: E): Result<never, E> =>
  new Failure(error);

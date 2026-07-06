import { AppError } from "./errors";

export class ApiResponse {
  static success<T>(data: T, meta?: unknown) {
    return Response.json(
      {
        success: true,
        data,
        ...(meta ? { meta } : {}),
      },
      { status: 200 },
    );
  }

  static created<T>(data: T) {
    return Response.json(
      {
        success: true,
        data,
      },
      { status: 201 },
    );
  }

  static failure(error: unknown) {
    if (error instanceof AppError) {
      return Response.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        },
        { status: error.statusCode },
      );
    }

    if (error instanceof Error) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: String(error),
        },
      },
      { status: 500 },
    );
  }
}

/** The default success envelope shape: `{ statusCode, timestamp, data }`. */
export interface ResponseEnvelope<T> {
  statusCode: number;
  timestamp: string;
  data: T;
}

/** The default error envelope shape: `{ statusCode, timestamp, error, message }`. */
export interface ErrorEnvelope {
  statusCode: number;
  timestamp: string;
  error: string;
  message: string | string[];
}

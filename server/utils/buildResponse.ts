type Headers = Record<string, string>;

const buildResponse = (
  statusCode: number,
  body: unknown,
  headers: Headers = {}
) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    ...headers,
  },
  body: JSON.stringify(body),
});

export { buildResponse };

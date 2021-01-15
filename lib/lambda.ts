export interface APIGatewayProxyEventV2 {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  cookies?: string[];
  headers: { [name: string]: string };
  queryStringParameters?: { [name: string]: string };
  requestContext: {
    accountId: string;
    apiId: string;
    authorizer?: {
      jwt: {
        claims: { [name: string]: string | number | boolean | string[] };
        scopes: string[];
      };
    };
    domainName: string;
    domainPrefix: string;
    http: {
      method: string;
      path: string;
      protocol: string;
      sourceIp: string;
      userAgent: string;
    };
    requestId: string;
    routeKey: string;
    stage: string;
    time: string;
    timeEpoch: number;
  };
  body?: string;
  pathParameters?: { [name: string]: string };
  isBase64Encoded: boolean;
  stageVariables?: { [name: string]: string };
}

export type APIGatewayProxyResultV2<T = never> =
  | APIGatewayProxyStructuredResultV2
  | string
  | T;

interface APIGatewayProxyStructuredResultV2 {
  statusCode?: number;
  headers?: {
    [header: string]: boolean | number | string;
  };
  body?: string;
  isBase64Encoded?: boolean;
  cookies?: string[];
}

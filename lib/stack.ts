import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";
import * as apigw from "@aws-cdk/aws-apigatewayv2";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNode from "@aws-cdk/aws-lambda-nodejs";
import * as secretsManager from "@aws-cdk/aws-secretsmanager";

export class Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = {
      SENDGRID_API_KEY: `${
        secretsManager.Secret.fromSecretNameV2(
          this,
          "sendgridApiKey",
          "edmPreferences/sendgridApiKey"
        ).secretValue
      }`,
    };

    const getHandler = new lambdaNode.NodejsFunction(this, "GetHandler", {
      environment,
      memorySize: 3008,
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(10),
      tracing: lambda.Tracing.ACTIVE,
    });

    const postHandler = new lambdaNode.NodejsFunction(this, "PostHandler", {
      environment,
      memorySize: 3008,
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(15),
      tracing: lambda.Tracing.ACTIVE,
    });

    const httpApi = new apigw.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowHeaders: ["Authorization"],
        allowMethods: [
          apigw.HttpMethod.GET,
          apigw.HttpMethod.HEAD,
          apigw.HttpMethod.OPTIONS,
          apigw.HttpMethod.POST,
        ],
        allowOrigins: [
          "https://parksaustralia.gov.au",
          "https://staging.parksaustralia.gov.au",
          "http://localhost:3000",
          "http://localhost:4000",
        ],
        maxAge: cdk.Duration.days(10),
      },
    });

    httpApi.addRoutes({
      path: "/data.json",
      methods: [apigw.HttpMethod.GET],
      integration: new LambdaProxyIntegration({
        handler: getHandler,
      }),
    });

    httpApi.addRoutes({
      path: "/",
      methods: [apigw.HttpMethod.POST],
      integration: new LambdaProxyIntegration({
        handler: postHandler,
      }),
    });

    new cdk.CfnOutput(this, "HTTP endpoint", {
      value: httpApi.apiEndpoint,
      exportName: "httpEndpoint",
    });
  }
}

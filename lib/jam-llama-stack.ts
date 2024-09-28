import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as cm from "aws-cdk-lib/aws-certificatemanager";
import * as njslambda from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from 'path';

export class JamLlamaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const baseDomain = "jamlaunch.com"
    const subdomain = "llama"
    const fullDomain = `${subdomain}.${baseDomain}`

    const zone = route53.HostedZone.fromLookup(this, "HostZone", {
      domainName: baseDomain,
    });

    const cert = new cm.Certificate(this, "Cert", {
      domainName: fullDomain,
      validation: cm.CertificateValidation.fromDns(zone),
    });
    const domainName = new apigateway.DomainName(this, "ApiDomain", {
      domainName: fullDomain,
      certificate: cert
    })

    const serverAuth = new HttpJwtAuthorizer(
      "ServerJwtAuth",
      `https://oid.jamlaunch.com`,
      {
        jwtAudience: ["jamlaunch-server-v2"],
      }
    )
    const api = new apigateway.HttpApi(this, 'Api', {
      defaultDomainMapping: {
        domainName: domainName
      },
      defaultAuthorizer: serverAuth,
    });

    new route53.ARecord(this, "ApiDns", {
      zone: zone,
      recordName: subdomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayv2DomainProperties(
          domainName.regionalDomainName,
          domainName.regionalHostedZoneId
        )
      ),
    });

    const llamaFunc = new njslambda.NodejsFunction(this, "LlamaFunc", {
      entry: join(__dirname, "../lambda/api-llama/index.ts"),
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
      },
    });
    llamaFunc.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));
    const llamaIntegration = new integrations.HttpLambdaIntegration("LlamaIntegration", llamaFunc)
    api.addRoutes({
      path: '/hello',
      methods: [apigateway.HttpMethod.POST],
      integration: llamaIntegration
    });

  }
}

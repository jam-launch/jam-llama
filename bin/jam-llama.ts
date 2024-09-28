#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { JamLlamaStack } from '../lib/jam-llama-stack';

const app = new cdk.App();
new JamLlamaStack(app, 'JLlamaStk', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
});
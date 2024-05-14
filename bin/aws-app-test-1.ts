#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsAppTest1Stack } from '../lib/aws-app-test-1-stack';
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname+'/.env' });
const awsAccountId : string = process.env.AWS_ACCOUNT_ID || '';
if (awsAccountId === '') {
  console.error('AWS_ACCOUNT_ID is not set in .env file');
  process.exit(1);
}
const awsRegionId : string = process.env.AWS_REGION_ID || 'us-east-1'; // lets be honest

const app = new cdk.App();
new AwsAppTest1Stack(app, 'AwsAppTest1Stack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Set the account you want to use in .env and use --profile to pass aws credentials  */
  env: { account: awsAccountId, region: awsRegionId },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
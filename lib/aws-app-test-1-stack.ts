import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class AwsAppTest1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MyVPC', {
      subnetConfiguration: [
        {
        cidrMask: 24,
        name: 'publ',
        subnetType: ec2.SubnetType.PUBLIC,
      },{
        cidrMask: 24,
        name: 'priv',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      {
        cidrMask: 28,
        name: 'isol',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }
      ],
      natGateways: 1, // NB: Save $$$ with this setting, default is 3!!!
    })
    const dbSecurityGroup = new ec2.SecurityGroup(this, `${this.stackName}-DbSecurityGroup`, {
      vpc,
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Postgres port');

    // create role for lambda
    const lambdaRole = new iam.Role(this, 'LambdaRunnerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    lambdaRole.addToPolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ssm:GetParameters', 'ssm:DescribeParameters', 'ssm:GetParameter'],
            resources: ['*'], // SECURITY NOTE: Grants access to all SSM Parameters
          })
    );

    // Define the RDS PostgreSQL instance
    const engine = rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_1 });
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine,
      parameters: {
        "rds.force_ssl": "0",
      },
    });
    const secureStringToken = cdk.SecretValue.ssmSecure('postgres-admin-pw', '1');
    const rdsInstance = new rds.DatabaseInstance(this, 'MyRDSInstance', {
      vpc,
      engine,
      parameterGroup,
      credentials: rds.Credentials.fromPassword('postgres', secureStringToken),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
      databaseName: 'YOUR_DATABASE_NAME',
      securityGroups: [dbSecurityGroup],
    });

    new cdk.CfnOutput(this, "DBInstanceEndpoint", {
      value: rdsInstance.dbInstanceEndpointAddress,
    });

    // Define the Lambda function to admin the DB
    const dockerFunc = new lambda.DockerImageFunction(this, "DbAdminDockerFunc", {
      code: lambda.DockerImageCode.fromImageAsset("./src/dbAdmin", {
        file: "Dockerfile",
      }),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        DB_HOST: rdsInstance.dbInstanceEndpointAddress,
        DB_NAME: 'YOUR_DATABASE_NAME',
      },
      securityGroups: [dbSecurityGroup],
      vpc,
      role: lambdaRole,
    });


    const functionUrl = dockerFunc.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
        allowedOrigins: ["*"],
      },
    });

    new cdk.CfnOutput(this, "DbAdminFunctionUrlValue", {
      value: functionUrl.url,
    });

    // Define Lambda function for app updates to the DB
    const syncAppDockerFunc = new lambda.DockerImageFunction(this, "SyncAppDockerFunc", {
      code: lambda.DockerImageCode.fromImageAsset("./src/syncApp", {
        file: "Dockerfile",
      }),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        DB_HOST: rdsInstance.dbInstanceEndpointAddress,
        DB_NAME: 'YOUR_DATABASE_NAME',
      },
      securityGroups: [dbSecurityGroup],
      vpc,
      role: lambdaRole,
    });



    const syncAppFunctionUrl = syncAppDockerFunc.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
        allowedOrigins: ["*"],
      },
    });

    new cdk.CfnOutput(this, "SyncAppFunctionUrlValue", {
      value: syncAppFunctionUrl.url,
    });


    // Define lambda function for public viewer app
    const viewerAppDockerFunc = new lambda.DockerImageFunction(this, "ViewerAppDockerFunc", {
      code: lambda.DockerImageCode.fromImageAsset("./src/viewApp", {
        file: "Dockerfile",
      }),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(10),
      architecture: lambda.Architecture.ARM_64,
      environment: {
        DB_HOST: rdsInstance.dbInstanceEndpointAddress,
        DB_NAME: 'YOUR_DATABASE_NAME',
      },
      securityGroups: [dbSecurityGroup],
      vpc,
      role: lambdaRole,
    });



    const viewerAppFunctionUrl = viewerAppDockerFunc.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
        allowedOrigins: ["*"],
      },
    });

    new cdk.CfnOutput(this, "ViewerAppFunctionUrlValue", {
      value: viewerAppFunctionUrl.url,
    });


    // Setup API Gateway
    const getTestIntegration = new HttpLambdaIntegration('TestIntegration', viewerAppDockerFunc);
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi');
    httpApi.addRoutes({
      path: '/test',
      methods: [ apigwv2.HttpMethod.GET ],
      integration: getTestIntegration,
    });

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.url!,
    });

  }
}


## CDK / TYPESCRIPT / SERVERLESS / POSTGRESQL

### an example skeleton of a serverless aws app

There are many example CDK apps out there which demonstrate how to run code on AWS, this is one of them.

This example stack implements three lambda functions which access a single PostgreSQL server instance running in RDS. The lambdas are for admin, read-write, and view-only usage.

Finally, there is an API V2 gateway which exposes access to the view-only lambda function.

This app is created as a devlog of my own progress in building serverless applications and is intended for educational use only.

Note that the database name is set to "YOUR_DATABASE_NAME" inside lib/aws-app-test-1-stack.ts.

@ivyroot


## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

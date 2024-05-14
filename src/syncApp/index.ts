import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import  SSM = require('aws-sdk/clients/ssm');
import postgres = require('postgres');

const ssm = new SSM();

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);

    const dbHost = process.env.DB_HOST
    const dbName = process.env.DB_NAME
    const dbUser = 'app_user'
    const passParameterName = "postgres-app-pw";
    const passData = await ssm.getParameter({ Name: passParameterName, WithDecryption: true }).promise();

    console.log(`CONNECTING TO DB_HOST: ${dbHost} DB_NAME: ${dbName} DB_USER: ${dbUser}`);
    const sql = postgres({
        host: dbHost,
        database: dbName,
        username: dbUser,
        password: passData.Parameter?.Value,
    });

    await sql`INSERT INTO public.notes (msg) VALUES ('hello world')`;

    const result = await sql`SELECT COUNT(*) FROM public.notes`;
    const dbVersion = await sql`SELECT version()`;

    const noteCount = result[0].count;

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Sync example results: ${JSON.stringify(result[0])} COUNT:${noteCount} DB VERSION:${dbVersion[0].version}`,
        }),
    };
};

import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import  SSM = require('aws-sdk/clients/ssm');
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres = require('postgres');

const ssm = new SSM();

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);
    console.log(`Context: ${JSON.stringify(context, null, 2)}`);

    const dbHost = process.env.DB_HOST
    const dbName = process.env.DB_NAME
    const dbUser = 'postgres'
    const passParameterName = "postgres-admin-pw";
    const passData = await ssm.getParameter({ Name: passParameterName, WithDecryption: true }).promise();

    console.log(`CONNECTING TO DB_HOST: ${dbHost} DB_NAME: ${dbName} DB_USER: ${dbUser}`);
    const sql = postgres({
        host: dbHost,
        database: dbName,
        username: dbUser,
        password: passData.Parameter?.Value,
    });

    const result = await sql`SELECT NOW()`;
    const dbVersion = await sql`SELECT version()`;

    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: './drizzle' });
    await createDbRoles(sql);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `hellos world from dbFriend! ${result[0].now} ${dbVersion[0].version}`,
        }),
    };
};

const createDbRoles = async (sql: any) => {
    const appUserExists = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'app_user'`;
    if (appUserExists.length == 0) {
        console.log(`Creating app_user`);
        const appPassParameterName = "postgres-app-pw";
        const appPassData = await ssm.getParameter({ Name: appPassParameterName, WithDecryption: true }).promise();
        await sql.unsafe(`CREATE USER app_user WITH PASSWORD '${ appPassData.Parameter?.Value }'`);
    } else {
        console.log(`app_user already exists`);
    }
    await sql`GRANT CONNECT ON DATABASE stkrstage1 TO app_user`;
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`;
    await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user`;

    const viewerUserExists = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'viewer_user'`;
    if (viewerUserExists.length == 0) {
        console.log(`Creating viewer_user`);
        const viewerPassParameterName = "postgres-readonly-pw";
        const viewerPassData = await ssm.getParameter({ Name: viewerPassParameterName, WithDecryption: true }).promise();
        await sql.unsafe(`CREATE USER viewer_user WITH LOGIN PASSWORD '${viewerPassData.Parameter?.Value}'`);
    }else{
        console.log(`viewer_user already exists`);
    }
    await sql`GRANT CONNECT ON DATABASE stkrstage1 TO viewer_user`;
    await sql`GRANT SELECT ON ALL TABLES IN SCHEMA public TO viewer_user`;
    await sql`GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO viewer_user`;
}
ARG NODE_VERSION=20
FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION} as builder
WORKDIR /usr/app
RUN echo Using NodeJS version ${NODE_VERSION}
COPY package.json drizzle.config.ts schema.ts  ./
COPY index.ts ./
RUN npm install
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION}
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
RUN echo "Built Sync App Handler"
CMD ["index.handler"]
ARG NODE_VERSION=20

FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION} as builder
WORKDIR /usr/app
COPY package.json drizzle.config.ts schema.ts  ./
COPY index.ts ./
COPY drizzle/ ./drizzle/
RUN npm install
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:${NODE_VERSION}
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/* ./
COPY --from=builder /usr/app/drizzle/ ./drizzle/
RUN echo "Built Setup Handler"
CMD ["index.handler"]
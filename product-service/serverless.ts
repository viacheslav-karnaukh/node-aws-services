import type { Serverless } from 'serverless/aws';
import dotenv from 'dotenv';

dotenv.config();

const {
  PGUSER,
  PGHOST,
  PGDATABASE,
  PGPASSWORD,
  PGPORT,
} = process.env;

const pgEnv = {
  PGUSER,
  PGHOST,
  PGDATABASE,
  PGPASSWORD,
  PGPORT,
};

const serverlessConfiguration: Serverless = {
  service: {
    name: 'product-service',
    // app and org for use with dashboard.serverless.com
    // app: your-app-name,
    // org: your-org-name,
  },
  frameworkVersion: '2',
  plugins: [
    'serverless-webpack',
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    stage: 'dev',
    region: 'eu-west-1',
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    },
  },
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    },
  },
  functions: {
    getProductsList: {
      handler: 'handler.getProductsList',
      environment: pgEnv,
      events: [
        {
          http: {
            method: 'get',
            path: 'products',
            cors: true,
          }
        }
      ],
    },
    getProductsById: {
      handler: 'handler.getProductsById',
      environment: pgEnv,
      events: [
        {
          http: {
            method: 'get',
            path: 'products/{productId}',
            cors: true,
            request: {
              parameters: {
                paths: {
                  productId: true,
                },
              },
            },
          }
        }
      ]
    },
    addProduct: {
      handler: 'handler.addProduct',
      environment: pgEnv,
      events: [
        {
          http: {
            method: 'post',
            path: 'products',
            cors: true,
          }
        }
      ]
    },
    getAvailableApiRoutes: {
      handler: 'handler.getAvailableApiRoutes',
      events: [
        {
          http: {
            method: 'get',
            path: '/',
            cors: true,
          }
        }
      ]
    }
  }
}

module.exports = serverlessConfiguration;

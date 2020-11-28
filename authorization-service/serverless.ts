import type { Serverless } from 'serverless/aws';
import dotenv from 'dotenv';

const serverlessConfiguration: Serverless = {
  service: {
    name: 'authorization-service',
    // app and org for use with dashboard.serverless.com
    // app: your-app-name,
    // org: your-org-name,
  },
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    }
  },
  // Add the serverless-webpack plugin
  plugins: ['serverless-webpack'],
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
  functions: {
    basicAuthorizer: {
      environment: dotenv.config().parsed,
      handler: 'handler.basicAuthorizer',
    }
  },
  resources: {
    Resources: {},
    Outputs: {
      BasicAuthorizerLambdaFunctionQualifiedArn: {
        // Value is created in CF template by serverless; adding export to it
        Export: {
          Name: {
            'Fn::Sub': '${AWS::StackName}-BasicAuthorizerArn'
          }
        }
      } as any
    }
  }
}

module.exports = serverlessConfiguration;

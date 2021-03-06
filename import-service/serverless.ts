import type { CloudFormationResources, Serverless, ResourcePolicy } from 'serverless/aws';
import dotenv from 'dotenv';
import { GatewayResponseType } from 'aws-sdk/clients/apigateway';

dotenv.config();

const { IMPORT_PRODUCTS_BUCKET } = process.env;
const STAGE = process.env.STAGE || 'dev';
const PRODUCT_SERVICE_STACK_NAME = `product-service-${STAGE}`;
const AUTHORIZATION_SERVICE_STACK_NAME = `authorization-service-${STAGE}`;
const IMPORT_PRODUCTS_BUCKET_ARN = `arn:aws:s3:::${IMPORT_PRODUCTS_BUCKET}`;
const bucketEnv = { IMPORT_PRODUCTS_BUCKET };

const enableGatewayResponseCors = (responseType: GatewayResponseType) => {
  return {
    Type: 'AWS::ApiGateway::GatewayResponse',
    Properties: {
      RestApiId: {
        Ref: 'ApiGatewayRestApi'
      },
      ResponseParameters: {
        'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
        'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
      },
      ResponseType: responseType
    }
  };
};

const resources: CloudFormationResources = {
  UploadBucket: {
    Type: 'AWS::S3::Bucket',
    Properties: {
      BucketName: IMPORT_PRODUCTS_BUCKET,
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedOrigins: ['*'],
            AllowedHeaders: ['*'],
            AllowedMethods: ['PUT']
          }
        ]
      }
    }
  },
  UploadBucketPolicy: {
    Type: 'AWS::S3::BucketPolicy',
    Properties: {
      Bucket: IMPORT_PRODUCTS_BUCKET,
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:*',
            Effect: 'Allow',
            Resource: `${IMPORT_PRODUCTS_BUCKET_ARN}/*`,
            Principal: {
              AWS: '*'
            }
          }
        ] as ResourcePolicy[]
      },
    },
  },
  ApiGatewayRestApi: {
    Type: 'AWS::ApiGateway::RestApi',
    Properties: {
      Name: {
        'Fn::Sub': '${AWS::StackName}'
      },
    }
  },
  ResponseUnauthorized: enableGatewayResponseCors('UNAUTHORIZED'),
  ResponseAccessDenied: enableGatewayResponseCors('ACCESS_DENIED'),
};

const serverlessConfiguration: Serverless = {
  service: {
    name: 'import-service',
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
    stage: STAGE,
    region: 'eu-west-1',
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      CATALOG_ITEMS_QUEUE_URL: {
        'Fn::ImportValue': `${PRODUCT_SERVICE_STACK_NAME}-CatalogItemsQueueUrl`,
      }
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: 's3:ListBucket',
        Resource: IMPORT_PRODUCTS_BUCKET_ARN,
      },
      {
        Effect: 'Allow',
        Action: 's3:*',
        Resource: `${IMPORT_PRODUCTS_BUCKET_ARN}/*`,
      },
      {
        Effect: 'Allow',
        Action: 'sqs:SendMessage',
        Resource: {
          'Fn::ImportValue': `${PRODUCT_SERVICE_STACK_NAME}-CatalogItemsQueueArn`,
        }
      }
    ]
  },
  functions: {
    importProductsFile: {
      handler: 'handler.importProductsFile',
      environment: bucketEnv,
      events: [
        {
          http: {
            method: 'get',
            path: 'import',
            cors: true,
            request: {
              parameters: {
                querystrings: {
                  name: true,
                },
                headers: {
                  'Access-Control-Allow-Origin': true
                }
              }
            },
            authorizer: {
              name: 'basicAuhorizer',
              arn: {
                'Fn::ImportValue': `${AUTHORIZATION_SERVICE_STACK_NAME}-BasicAuthorizerArn`
              } as any,
              resultTtlInSeconds: 0,
              identitySource: 'method.request.header.Authorization',
            },
          }
        }
      ]
    },
    importFileParser: {
      handler: 'handler.importFileParser',
      environment: bucketEnv,
      events: [
        {
          s3: {
            bucket: IMPORT_PRODUCTS_BUCKET,
            event: 's3:ObjectCreated:*',
            rules: [
              {
                prefix: 'uploaded/',
                suffix: '.csv'
              }
            ],
            existing: true
          }
        }
      ]
    }
  },
  resources: {
    Resources: resources,
  }
}

module.exports = serverlessConfiguration;

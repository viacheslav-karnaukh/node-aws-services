import type { CloudFormationResources, Serverless } from 'serverless/aws';
import dotenv from 'dotenv';

dotenv.config();

const {
  PGUSER,
  PGHOST,
  PGDATABASE,
  PGPASSWORD,
  PGPORT,
  PRODUCTS_SUBSCRIPTION_EMAIL,
  EXPENSIVE_PRODUCTS_SUBSCRIPTION_EMAIL,
} = process.env;

const pgEnv = {
  PGUSER,
  PGHOST,
  PGDATABASE,
  PGPASSWORD,
  PGPORT,
};

const resources: CloudFormationResources = {
  CatalogItemsQueue: {
    Type: 'AWS::SQS::Queue',
    Properties: {
      QueueName: 'catalogItemsQueue'
    }
  },
  CreateProductTopic: {
    Type: 'AWS::SNS::Topic',
    Properties: {
      TopicName: 'createProductTopic'
    }
  },
  CreateProductTopicSubscription: {
    Type: 'AWS::SNS::Subscription',
    Properties: {
      Protocol: 'email',
      Endpoint: PRODUCTS_SUBSCRIPTION_EMAIL,
      TopicArn: {
        Ref: 'CreateProductTopic'
      }
    }
  },
  CreateExpensiveProductTopicSubscription: {
    Type: 'AWS::SNS::Subscription',
    Properties: {
      Protocol: 'email',
      Endpoint: EXPENSIVE_PRODUCTS_SUBSCRIPTION_EMAIL,
      TopicArn: {
        Ref: 'CreateProductTopic'
      },
      FilterPolicy: {
        highestPrice: [
          {
            numeric: ['>=', 100]
          }
        ]
      }
    }
  }
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
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: 'sqs:ReceiveMessage',
        Resource: {
          'Fn::GetAtt': [ 'CatalogItemsQueue', 'Arn' ]
        }
      },
      {
        Effect: 'Allow',
        Action: 'sns:Publish',
        Resource: {
          Ref: 'CreateProductTopic'
        }
      }
    ]
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
    },
    catalogBatchProcess: {
      handler: 'handler.catalogBatchProcess',
      environment: {
        ...pgEnv,
        CREATE_PRODUCT_TOPIC_ARN: {
          Ref: 'CreateProductTopic'
        }
      },
      events: [
        {
          sqs: {
            arn: {
              'Fn::GetAtt': [ 'CatalogItemsQueue', 'Arn' ]
            },
            batchSize: 5
          }
        }
      ]
    }
  },
  resources: {
    Resources: resources,
    Outputs: {
      QueueURL: {
        Value: {
          Ref: 'CatalogItemsQueue'
         },
         Export: {
           Name: {
             'Fn::Sub': '${AWS::StackName}-CatalogItemsQueueUrl'
           }
         }
      },
      QueueARN: {
        Value: {
          'Fn::GetAtt': [ 'CatalogItemsQueue', 'Arn' ]
         },
         Export: {
           Name: {
            'Fn::Sub': '${AWS::StackName}-CatalogItemsQueueArn'
           }
         }
      }
   }
  }
}

module.exports = serverlessConfiguration;

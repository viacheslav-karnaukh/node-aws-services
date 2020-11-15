import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import importProductsFile from '../functions/importProductsFile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

describe('importProductsFile', () => {
  beforeAll(() => {
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('S3', 'getSignedUrl', (_, {
      Key
    }, cb) => {
      const signedUrl = `https://aws-s3-url/${Key}`;
      cb(null, signedUrl)
    });
  });

  afterAll(() => {
    AWSMock.restore('S3');
  });

  test('correct upload destination', async () => {
    const fileName = 'file.csv';
    const event = {
      queryStringParameters: { name: fileName }
    } as unknown as APIGatewayProxyEvent;

    const expectedKey = `uploaded/${fileName}`;
    const lambdaResponse: APIGatewayProxyResult = {
      statusCode: 200,
      body: `https://aws-s3-url/${expectedKey}`
    };
    const res = await importProductsFile(event, null, null) as APIGatewayProxyResult;

    expect(res.body).toBe(lambdaResponse.body);
  });

  test('correct file name decoding', async () => {
    const fileName = 'file%20with%20spaces.csv';
    const event = {
      queryStringParameters: { name: fileName }
    } as unknown as APIGatewayProxyEvent;

    const expectedKey = 'uploaded/file with spaces.csv';
    const lambdaResponse: APIGatewayProxyResult = {
      statusCode: 200,
      body: `https://aws-s3-url/${expectedKey}`
    };
    const res = await importProductsFile(event, null, null) as APIGatewayProxyResult;

    expect(res.body).toBe(lambdaResponse.body);
  });
});

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import AWS from 'aws-sdk';
import 'source-map-support/register';

const importProductsFile: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('event.queryStringParameters -->', event.queryStringParameters);
  const name = decodeURIComponent(event.queryStringParameters?.name);
  const s3 = new AWS.S3({ region: 'eu-west-1' });
  const params = {
    Bucket: process.env.IMPORT_PRODUCTS_BUCKET,
    Key: `uploaded/${name}`,
    Expires: 60,
    ContentType: 'text/csv'
  };
  const signedUrl = await s3.getSignedUrlPromise('putObject', params);

  return {
    statusCode: 200,
    body: signedUrl,
  };
};

export default middy(importProductsFile).use(cors());

import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import middy from 'middy';
import { cors } from 'middy/middlewares';
import 'source-map-support/register';

import { findAllProducts } from '../model/productsModel';

export const getProductsList: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    body: JSON.stringify(findAllProducts()),
  };
}

export default middy(getProductsList).use(cors());

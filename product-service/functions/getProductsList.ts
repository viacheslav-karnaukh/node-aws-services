import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import middy from 'middy';
import { cors } from 'middy/middlewares';
import 'source-map-support/register';

import { findAllProducts } from '../model/productsModel';

export const getProductsList: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  let result;
  try {
    result = await findAllProducts();
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch(e) {
    return {
      statusCode: e.statusCode || 500,
      body: e.message,
    };
  }
}

export default middy(getProductsList).use(cors());

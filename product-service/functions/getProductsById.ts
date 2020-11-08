import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import middy from 'middy';
import { cors } from 'middy/middlewares';
import 'source-map-support/register';

import { findProductById, ProductType } from '../model/productsModel';

export const getProductsById: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { productId } = event?.pathParameters || {};
  let product: ProductType;

  console.log('productId -->', productId);

  try {
    product = await findProductById(productId);
    return {
      statusCode: 200,
      body: JSON.stringify(product),
    };
  } catch(e) {
    return {
      statusCode: e.statusCode,
      body: e.message || 500,
    }
  }
}

export default middy(getProductsById).use(cors());

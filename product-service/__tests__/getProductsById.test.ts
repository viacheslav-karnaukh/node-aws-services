import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProductsById } from '../functions/getProductsById';

const EXISTING_PRODUCT_ID = '7567ec4b-b10c-48c5-9345-fc73c48a80aa';
const NON_EXISTING_PRODUCT_ID = 'product-does-not-exist';

const getHandlerResponse = async (productId?: string): Promise<APIGatewayProxyResult> => {
  const event = {
    pathParameters: { productId: productId }
  } as unknown as APIGatewayProxyEvent;
  const response = await getProductsById(event, null, null);
  return response as APIGatewayProxyResult;
};

describe('getProductsById handler', () => {
  describe('#product can be found', () => {
    let handlerResponse: APIGatewayProxyResult;

    beforeEach(async () => {
      handlerResponse = await getHandlerResponse(EXISTING_PRODUCT_ID);
    });

    test('product retrieval', async () => {
      expect(JSON.parse(handlerResponse.body)).toHaveProperty('id');
    });

    test('status code 200', async () => {
      return expect(handlerResponse.statusCode).toBe(200);
    });
  });

  describe('#product cannot be found', () => {
    let handlerResponse: APIGatewayProxyResult;

    beforeEach(async () => {
      handlerResponse = await getHandlerResponse(NON_EXISTING_PRODUCT_ID);
    });

    test('error message', async () => {
      expect(handlerResponse.body).toBe('Product not found');
    });

    test('status code 404', async () => {
      return expect(handlerResponse.statusCode).toBe(404);
    });
  });
});

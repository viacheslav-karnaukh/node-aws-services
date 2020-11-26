import { APIGatewayProxyResult } from 'aws-lambda';
import { getProductsList } from '../functions/getProductsList';

jest.mock('pg', () => ({
  Client: jest.fn(() => ({
      connect: jest.fn(),
      query: jest.fn().mockImplementation(() => ({
          rows: [],
      })),
      end: jest.fn(),
  })),
}));

describe('getProductsList handler', () => {
  test('list of products', async () => {
    const response = await getProductsList(null, null, null) as APIGatewayProxyResult;
    expect(JSON.parse(response.body)).toBeInstanceOf(Array);
  });

  test('status code 200', async () => {
    const response = await getProductsList(null, null, null) as APIGatewayProxyResult;
    expect(response.statusCode).toBe(200);
  });
});

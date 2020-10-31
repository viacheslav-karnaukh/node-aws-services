import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import middy from 'middy';
import { cors } from 'middy/middlewares';
import 'source-map-support/register';

import swagger from '../swagger-dev.json';

const getAvailableApiRoutes: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  const paths = Object.keys(swagger.paths);
  return {
    statusCode: 200,
    body: `Available paths:\n${paths.join('\n')}`,
  };
}

export default middy(getAvailableApiRoutes).use(cors());

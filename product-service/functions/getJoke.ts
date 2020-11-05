import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';
import axios from 'axios';

const API_ROOT = 'https://api.chucknorris.io/jokes';

const getJoke: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  let message: string;
  let statusCode: number;

  try {
    const res = await axios.get(`${API_ROOT}/random`);
    const { data, status } = res;
    message = data?.value || '';
    statusCode = status;
  } catch(e) {
    message = e.message;
    statusCode = e.message.replace('Request failed with status code ', '') || 500;
  }

  return {
    statusCode,
    body: message,
  };
}

export default getJoke;

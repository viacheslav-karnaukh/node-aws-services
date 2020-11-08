import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import middy from 'middy';
import { cors } from 'middy/middlewares';
import 'source-map-support/register';

import { insertProduct } from '../model/productsModel';
import { ProductsModelError } from '../model/ProductsModelError';

type ShemaType = {
  [key:string]: (valur: any) => boolean
}

const findInvalidFields = (object, schema: ShemaType) => {
  return Object.entries(schema)
    .filter(([key, isValid]) => !isValid(object[key]))
    .map(([key]) => key);
};

const canBeEmpty = (value) => [undefined, null].includes(value);

const productSchema = {
  title: (value) => value && typeof value === 'string',
  description: (value) => typeof value === 'string' || canBeEmpty(value),
  price: (value) => typeof value === 'number' || canBeEmpty(value),
  count: (value) => typeof value === 'number' || canBeEmpty(value),
};

export const addProduct: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const productData = JSON.parse(event.body);

  console.log('productData -->', productData);

  try {
    const invalidFields = findInvalidFields(productData, productSchema);

    if(invalidFields.length) {
      console.log('invalid fields -->', findInvalidFields);
      throw new ProductsModelError('Product data is invalid', 400);
    }

    const createdProduct = await insertProduct(productData);

    return {
      statusCode: 201,
      body: JSON.stringify(createdProduct)
    };
  } catch(e) {
    return {
      statusCode: e.statusCode || 500,
      body: e.message,
    }
  }
}

export default middy(addProduct).use(cors());

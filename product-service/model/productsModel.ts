import { HttpError } from './HttpError';
import productsList from './productsList.json';

export type ProductType = {
  count: number
  description: string
  id: string
  price: number
  title: string
}

export const findAllProducts = (): ProductType[] => {
  return productsList;
};

export const findProductById = (id: string): ProductType | null => {
  const foundProduct = productsList.find((product) => product.id === id);
  if(foundProduct) {
    return foundProduct;
  }

  throw new HttpError('Product not found', 404); 
};

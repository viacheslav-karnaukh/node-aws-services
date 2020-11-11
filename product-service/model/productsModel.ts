import { Client, ClientConfig } from 'pg';
import { ProductsModelError } from './ProductsModelError';

const {
  PGUSER,
  PGHOST,
  PGDATABASE,
  PGPASSWORD,
  PGPORT,
} = process.env;

const dbOptions: ClientConfig = {
  user: PGUSER,
  host: PGHOST,
  database: PGDATABASE,
  password: PGPASSWORD,
  port: Number(PGPORT),
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 5000,
};

export type ProductType = {
  count: number
  description: string
  id: string
  price: number
  title: string
}

const sql = (
	strings: TemplateStringsArray,
	...values: any[]
): string => String.raw(strings, ...values);

export const findAllProducts = async (): Promise<ProductType[]> => {
  const client = new Client(dbOptions);
  let productsList: ProductType[];
  const findAllQuery = sql`
    select p.id, count, price, title, description
    from products p
    join stocks s
    on p.id=s.product_id
  `;

  await client.connect();

  try {
    productsList = (await client.query(findAllQuery)).rows;
    return productsList;
  } catch(e) {
    throw new ProductsModelError(e.message);
  } finally {
    await client.end();
  }
};

export const findProductById = async (id: string): Promise<ProductType> => {
  const client = new Client(dbOptions);
  let product: ProductType;
  const findByIdQuery = sql`
    select p.id, count, title, description, price
    from products p
    join stocks s
    on p.id=s.product_id 
    where p.id=$1
  `;

  await client.connect();

  try {
    product = (await client.query(findByIdQuery, [id])).rows[0];
    if(!product) {
      throw new ProductsModelError('Product not found', 404);
    }
    return product;
  } catch(e) {
    throw new ProductsModelError(e.message, e.statusCode);
  } finally {
    await client.end();
  }
};

export const insertProduct = async ({
  count,
  description,
  price,
  title
}: ProductType): Promise<ProductType> => {
  const client = new Client(dbOptions);
  await client.connect();

  try {
    await client.query(sql`begin`);
    const insertProductQuery = sql`
      insert into products (title, description, price)
      values($1, $2, $3) returning id;
    `;
    const insertStockQuery = sql`
      insert into stocks (product_id, count)
      values($1, $2)
    `;
    const { id } = (await client.query(insertProductQuery, [
      title,
      description,
      price
    ])).rows[0];

    await client.query(insertStockQuery, [id, count]);
    await client.query(sql`commit`);

    return {
      id,
      count,
      description,
      price,
      title
    };
  } catch(e) {
    await client.query(sql`rollback`);
    throw new ProductsModelError(e.message, 500);
  } finally {
    await client.end();
  }
};

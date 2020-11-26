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

const runInsertTransaction = async (dbClient: Client, {
  count,
  description,
  price,
  title
}: ProductType): Promise<ProductType> => {
  try {
    await dbClient.query(sql`begin`);
    const insertProductQuery = sql`
      insert into products (title, description, price)
      values($1, $2, $3) returning id;
    `;
    const insertStockQuery = sql`
      insert into stocks (product_id, count)
      values($1, $2)
    `;
    const { id } = (await dbClient.query(insertProductQuery, [
      title,
      description,
      price
    ])).rows[0];

    await dbClient.query(insertStockQuery, [id, count]);
    await dbClient.query(sql`commit`);

    return {
      id,
      count,
      description,
      price,
      title
    };
  } catch(e) {
    await dbClient.query(sql`rollback`);
    throw new ProductsModelError(e.message, 500);
  }
};

export const insertProduct = async (product: ProductType): Promise<ProductType> => {
  const dbClient = new Client(dbOptions);
  await dbClient.connect();

  try {
    const createdProduct = await runInsertTransaction(dbClient, product);
    return createdProduct;
  } catch(e) {
    await dbClient.query(sql`rollback`);
    throw new ProductsModelError(e.message, 500);
  } finally {
    await dbClient.end();
  }
};

export const insertProducts = async (products: ProductType[]) => {
  const dbClient = new Client(dbOptions);
  await dbClient.connect();

  const batchTransactionsResults = await Promise.allSettled(products.map(async (product) => {
    try {
      await runInsertTransaction(dbClient, product);
    } catch(e) {
      throw {
        message: e.message,
        product,
      };
    }
  })).catch((e) => e);

  const failedRecordsData = batchTransactionsResults.filter(({ status }) => status === 'rejected');

  try {
    if(failedRecordsData.length) {
      throw {
        message: 'Some records were not inserted',
        failedRecordsData: failedRecordsData.map((failedRecord) => JSON.stringify(failedRecord.reason))
      };
    }
  } finally {
    await dbClient.end();
  }
};

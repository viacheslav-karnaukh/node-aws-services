import { SQSEvent } from 'aws-lambda';
import { SNS } from 'aws-sdk';
import 'source-map-support/register';

import { insertProducts } from '../model/productsModel';

const catalogBatchProcess = async (event: SQSEvent) => {
  const sns = new SNS();
  const recordsData = event.Records.map((record) => JSON.parse(record.body));

  try {
    await insertProducts(recordsData);
    console.log('catalogBatchProcess records inserted -->', recordsData);
    const highestPrice = Math.max(...recordsData.map(({ price }) => Number(price)));

    await sns.publish({
      Subject: 'Products data uploaded',
      Message: `Uploaded products:\n\n${JSON.stringify(recordsData, null, 2)}`,
      TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
      MessageAttributes: {
        highestPrice: {
          DataType: 'Number',
          StringValue: String(highestPrice)
        }
      }
    }).promise();
    console.log(`email was sent with ${recordsData.length} record(s)`);
  } catch(e) {
    console.error(e);
  }
}

export default catalogBatchProcess;

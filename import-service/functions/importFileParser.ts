import { S3Event, S3Handler } from 'aws-lambda';
import { S3, SQS } from 'aws-sdk';
import csv from 'csv-parser';
import 'source-map-support/register';
import { Transform } from 'stream';

const { IMPORT_PRODUCTS_BUCKET, CATALOG_ITEMS_QUEUE_URL } = process.env;
const SOURCE_FOLDER = 'uploaded';
const TARGET_FOLDER = 'parsed';

const sendRecordsToQueue = (s3: S3, source: string, sqs: SQS): Promise<Transform> => {
  const csvReadStream = s3.getObject({
    Bucket: IMPORT_PRODUCTS_BUCKET,
    Key: source
  }).createReadStream();

  const transformRecordsStream = csvReadStream.pipe(csv());

  transformRecordsStream.on('data', (parsedRecord) => {
    console.log(parsedRecord);
    sqs.sendMessage({
      MessageBody: JSON.stringify(parsedRecord),
      QueueUrl: CATALOG_ITEMS_QUEUE_URL
    }, (err, data) => {
      if(err) {
        console.error(err);
        return;
      }
      console.log(data);
    });
  });

  return new Promise((resolve, reject): Transform => transformRecordsStream
    .on('error', reject)
    .on('end', resolve));
};

const copyCsvFile = (s3: S3, source: string) => {
  return s3.copyObject({
    Bucket: IMPORT_PRODUCTS_BUCKET,
    CopySource: `${IMPORT_PRODUCTS_BUCKET}/${source}`,
    Key: source.replace(SOURCE_FOLDER, TARGET_FOLDER)
  }).promise();
};

const deleteCsvFile = (s3: S3, source: string) => {
  return s3.deleteObject({
    Bucket: IMPORT_PRODUCTS_BUCKET,
    Key: source
  }).promise();
};

const importFileParser: S3Handler = async (event: S3Event): Promise<void> => {
  const s3 = new S3({ region: 'eu-west-1' });
  const sqs = new SQS();

  for (const record of event.Records) {
    const source = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const fileName = source.replace(`${SOURCE_FOLDER}/`, '');

    await sendRecordsToQueue(s3, source, sqs);
    await copyCsvFile(s3, source);
    await deleteCsvFile(s3, source);

    console.log(`File ${fileName} was moved from /${SOURCE_FOLDER} to /${TARGET_FOLDER}`);
  }
};

export default importFileParser;

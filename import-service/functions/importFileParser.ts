import { S3Event, S3Handler } from 'aws-lambda';
import AWS, { S3 } from 'aws-sdk';
import csv from 'csv-parser';
import 'source-map-support/register';
import { Readable } from 'stream';

const { IMPORT_PRODUCTS_BUCKET } = process.env;
const SOURCE_FOLDER = 'uploaded';
const TARGET_FOLDER = 'parsed';

const readCsvFile = (s3: S3, source: string): Promise<Readable> => {
  const csvReadStream = s3.getObject({
    Bucket: IMPORT_PRODUCTS_BUCKET,
    Key: source
  }).createReadStream();

  csvReadStream.pipe(csv()).on('data', console.log);

  return new Promise((resolve, reject): Readable => csvReadStream
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
  const s3 = new AWS.S3({ region: 'eu-west-1' });

  for (const record of event.Records) {
    const source = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const fileName = source.replace(`${SOURCE_FOLDER}/`, '');

    await readCsvFile(s3, source);
    await copyCsvFile(s3, source);
    await deleteCsvFile(s3, source);

    console.log(`File ${fileName} was moved from /${SOURCE_FOLDER} to /${TARGET_FOLDER}`);
  }
};

export default importFileParser;

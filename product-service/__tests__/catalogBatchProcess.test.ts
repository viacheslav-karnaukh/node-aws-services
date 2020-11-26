import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import catalogBatchProcess from '../functions/catalogBatchProcess';

jest.mock('pg', () => ({
  Client: jest.fn(() => ({
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
  })),
}));

let snsPublishMock;
let originalConsoleError = console.error;
let consoleErrorMessage;

describe('catalogBatchProcess', () => {
  beforeAll(async (done) => {
    snsPublishMock = jest.fn();
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('SNS', 'publish', (params, cb) => {
      snsPublishMock(params);
      cb(null);
    });
    console.error = (e) => consoleErrorMessage = e.message;
    done();
  });

  afterAll(() => {
    AWSMock.restore('SNS');
    jest.clearAllMocks();
    console.error = originalConsoleError;
  });

  test('publish message', async () => {
    const eventFixture = {
      Records: []
    };
    await catalogBatchProcess(eventFixture);
    expect(snsPublishMock).toHaveBeenCalled();
  });

  test('logs in case of products were not saved', async () => {
    snsPublishMock.mockImplementation(() => {
      throw new Error('Products were not saved');
    })
    const eventFixture = {
      Records: []
    };
    await catalogBatchProcess(eventFixture);

    expect(consoleErrorMessage).toBe('Products were not saved');
  });
});

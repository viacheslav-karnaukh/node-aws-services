const express = require('express');
const cors = require('cors');
const axios = require('axios').default;
require('dotenv').config();

const makeRecipientCall = (req, res) => {
  const { originalUrl, method, body } = req;
  const recipient = originalUrl.split('/')[1];
  const recipientUrl = process.env[recipient];
  const shouldUseCache = method === 'GET';
  const axiosConfig = Object.assign({
    method: method,
    url: `${recipientUrl}${originalUrl}`
  }, Object.keys(body || {}).length > 0 && { data: body });

  console.log('axiosConfig', axiosConfig);
  axios(axiosConfig)
    .then(({ data }) => {
      if (shouldUseCache) {
        req.app.get('cache').set(originalUrl, {
          data,
          lastUpdated: new Date()
        });
      }
      res.json(data);
    })
    .catch(({ message, response }) => {
      if (response) {
        const { status, data } = response;
        res.status(status).json(data);
      } else {
        res.status(500).json({ error: message });
      }
    });
}

const cacheMiddleware = (req, res, next) => {
  const { method, originalUrl } = req;
  const shouldUseCache = method === 'GET';

  if(shouldUseCache) {
    const cachedData = req.app.get('cache').get(originalUrl);
    const hasValidCacheData = cachedData && new Date - cachedData.lastUpdated < 2 * 60 * 1000;

    if(hasValidCacheData) {
      res.status(200).json(cachedData.data);
      return;
    }
    return makeRecipientCall(req, res);
  }

  next();
};

const port = process.env.PORT || 3001;
const app = express();

app.use(express.json());
app.use(cors());
app.use(cacheMiddleware);

app.set('cache', new Map());


app.all('/*', (req, res) => {
  const { originalUrl, method } = req;
  console.log('originalUrl', originalUrl)
  console.log('method', method)
  const recipient = originalUrl.split('/')[1];

  const recipientUrl = process.env[recipient];

  if(recipientUrl) {
    makeRecipientCall(req, res);
  } else {
    res.status(502).json({ error: 'Cannot process request' })
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

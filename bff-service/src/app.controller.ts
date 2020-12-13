import {
  All,
  Controller,
  HttpException,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Response, Request } from 'express';

const CACHE_VALIDITY_TIME = 2 * 60 * 1000;

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  private async makeRecipientCall(
    req: Request,
    res: Response,
    recipientUrl: string,
  ) {
    const { originalUrl, method, body } = req;
    const shouldUseCache = method === 'GET';

    if (shouldUseCache) {
      const cachedData = req.app.get('cache').get(originalUrl);
      const hasValidCacheData = cachedData && Date.now() < cachedData.expiresAt;

      if (hasValidCacheData) {
        res.status(HttpStatus.OK).json(cachedData.data);
        return;
      }
    }

    try {
      const { data } = await this.appService.request({
        method,
        url: `${recipientUrl}${originalUrl}`,
        body,
      });
      if (shouldUseCache) {
        req.app.get('cache').set(originalUrl, {
          data,
          expiresAt: Date.now() + CACHE_VALIDITY_TIME,
        });
      }
      return res.status(HttpStatus.OK).json(data);
    } catch ({ message, response }) {
      if (response) {
        const { status, data } = response;
        res.status(status).json(data);
      } else {
        throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @All()
  async proxy(@Req() req: Request, @Res() res: Response): Promise<any> {
    const { originalUrl } = req;
    const recipient = originalUrl.split('/')[1];
    const recipientUrl = process.env[recipient];

    if (recipientUrl) {
      this.makeRecipientCall(req, res, recipientUrl);
    } else {
      throw new HttpException('Cannot process request', HttpStatus.BAD_GATEWAY);
    }
  }
}

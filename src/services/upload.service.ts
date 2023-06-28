import { UploadOptions } from '../cores/models/upload-options';
import { ImmichApi } from '../api/client';
import { UploadTarget } from '../cores';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import fs from 'node:fs';
import mime from 'mime-types';
import FormData from 'form-data';
import axios, { AxiosRequestConfig } from 'axios';
import { Subject } from 'rxjs';
import { UploadEvent } from '../cores/models/upload-event';

export class UploadService {
  private readonly immichApi: ImmichApi;
  private readonly options: UploadOptions;

  constructor(immichApi: ImmichApi, options: UploadOptions) {
    this.immichApi = immichApi;
    this.options = options;
  }

  public async uploadFiles(targets: UploadTarget[], uploadEvent$: Subject<UploadEvent>): Promise<void> {
    let uploadLength = targets.length;
    for (const target of targets) {
      const fileStat = await stat(target.path);

      const data = new FormData();
      data.append('deviceAssetId', target.id);
      data.append('deviceId', this.options.deviceId);
      data.append('assetType', this.getFileType(target.path));
      data.append('createdAt', fileStat.mtime.toISOString());
      data.append('modifiedAt', fileStat.mtime.toISOString());
      data.append('isFavorite', JSON.stringify(false));
      data.append('fileExtension', path.extname(target.path));
      data.append('duration', '0:00:00.000000');
      data.append('assetData', fs.createReadStream(target.path));

      const config: AxiosRequestConfig<any> = {
        method: 'post',
        maxRedirects: 0,
        url: `${this.immichApi.serverUrl}/asset/upload`,
        headers: {
          'x-api-key': this.immichApi.key,
          ...data.getHeaders(),
        },
        maxContentLength: Number.POSITIVE_INFINITY,
        maxBodyLength: Number.POSITIVE_INFINITY,
        data: data,
      };

      try {
        const uploadEvent = new UploadEvent();
        uploadEvent.fileName = target.path;
        uploadEvent.remainder = uploadLength;
        uploadEvent$.next(uploadEvent);

        await axios(config);

        uploadEvent.remainder = uploadLength--;
        uploadEvent$.next(uploadEvent);
      } catch {
        console.log('error');
      }
    }
  }

  private getFileType(filePath: string): string {
    return (mime.lookup(filePath) as string).split('/')[0].toUpperCase();
  }
}

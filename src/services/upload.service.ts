import { ImmichApi } from '../api/client';
import { UploadTarget } from '../cores';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';

export class UploadService {
  private readonly immichApi: ImmichApi;
  private readonly deviceId: string;

  constructor(immichApi: ImmichApi, deviceId: string) {
    this.immichApi = immichApi;
    this.deviceId = deviceId;
  }

  public async uploadFiles(targets: UploadTarget[]): Promise<void> {
    let uploadLength = targets.length;
    let uploadCounter: number = 0;

    console.log('Will upload ' + uploadLength + ' assets');
    for (const target of targets) {
      const formData = new FormData();
      await target.read();

      formData.append('assetType', target.assetType);
      formData.append('assetData', target.assetData, { filename: target.path });
      formData.append('deviceAssetId', target.deviceAssetId);
      formData.append('deviceId', this.deviceId);
      formData.append('fileCreatedAt', target.fileCreatedAt);
      formData.append('fileModifiedAt', target.fileModifiedAt);
      formData.append('isFavorite', String(false));
      formData.append('fileExtension', target.fileExtension);
      if (target.sidecarData) {
        formData.append('sidecarData', target.sidecarData, {
          filename: target.sidecarPath,
          contentType: 'application/xml',
        });
      }

      let axiosUploadConfig = this.immichApi.getAxiosUploadConfig;
      axiosUploadConfig.data = formData;

      // TODO: retry on 500 errors?
      await axios(axiosUploadConfig);

      uploadCounter++;
      console.log(uploadCounter + '/' + uploadLength + ' uploaded: ' + target.path);
    }
  }
}

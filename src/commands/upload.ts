import { Flags } from '@oclif/core';
import chokidar from 'chokidar';
import { Subject, mergeMap } from 'rxjs';
import { BaseCommand } from '../cli/base-command';
import { UploadOptions } from '../cores';
import { AlbumService, DirectoryService, UploadService } from '../services';

// ./bin/dev upload --help
// ./bin/dev upload -k ol7fY271I58KF2ZdcwqG31GRhFFqhzTR3X9ZRRWBI -s http://10.1.15.216:2283/api -d ./test-assets
// ./bin/run upload -k ol7fY271I58KF2ZdcwqG31GRhFFqhzTR3X9ZRRWBI -s http://10.1.15.216:2283/api -d ./test-assets

export default class Upload extends BaseCommand<typeof Upload> {
  static description = 'Upload assets to server';

  static flags = {
    directory: Flags.string({ char: 'd', required: true, description: 'Directory to upload from' }),
    watch: Flags.boolean({ char: 'w', description: 'Enable watch mode', default: false }),
    createAlbum: Flags.boolean({ aliases: ['al'], char: 'a', description: 'Create album of sub directory on upload' }),
    albumName: Flags.string({
      description: 'Album name (applicable when --createAlbum is present)',
      dependsOn: ['createAlbum'],
    }),
  };

  private directoryService!: DirectoryService;
  private uploadService!: UploadService;
  private albumService!: AlbumService;
  private files$ = new Subject();

  public async run(): Promise<void> {
    const options = new UploadOptions();
    options.deviceId = this.deviceId;
    options.directory = this.flags.directory;

    this.directoryService = new DirectoryService();
    this.uploadService = new UploadService(this.immichApi, options);
    this.albumService = new AlbumService(this.immichApi);

    const remoteIds = await this.uploadService.getUploadedAssetIds();
    const remoteAssetMap: Record<string, boolean> = {};
    const remoteAlbums = await this.albumService.getAllAlbums();

    for (const id of remoteIds) {
      remoteAssetMap[id] = true;
    }

    console.log('remoteAssetMap', remoteAssetMap);
    console.log('remoteAlbums', remoteAlbums);
    // await (this.flags.watch ? this.watch() : this.runOnce());

    this.files$
      .pipe(
        mergeMap(async (file: any) => {
          console.log('file', file.path);
          return file;
        }),
      )
      .subscribe(() => console.log('ok'));

    chokidar
      .watch(this.flags.directory, {
        ignored: /(^|[/\\])\../,
        persistent: this.flags.watch,
        awaitWriteFinish: true,
      })
      .on('add', (path, stat) => {
        if (this.directoryService.filterAcceptedFileType(path)) {
          this.files$.next({ path, stat });
        }
      });
  }

  // async watch(): Promise<void> {
  //   console.log('watch dir');
  // }

  // async runOnce(): Promise<void> {
  //   ux.action.start('Upload');

  //   ux.action.start('Upload', 'Indexing files');
  //   const local = await this.directoryService.buildUploadTarget(this.flags.directory);
  //   const remote = await this.uploadService.getUploadedAssetIds();
  //   const toUpload = local.filter((x) => !remote.includes(x.id));

  //   if (this.flags.createAlbum) {
  //     ux.action.start('Upload', 'Upload as album');
  //     await this.uploadAsAlbum(local, this.flags.albumName);
  //     ux.action.stop();
  //   } else {
  //     await this.uploadOnce(toUpload, local);
  //   }

  //   this.exit(0);
  // }

  // /**
  //  * Upload as album based on sub directory
  //  */
  // async uploadAsAlbum(targets: UploadTarget[], albumName?: string): Promise<void> {
  //   const albumService = new AlbumService();

  //   const albumCollection = albumService.createAlbumCollection(targets);

  //   /**
  //    * Scenario 1.
  //    * If an album hasn't been created, it will be created first before adding the files to the albums
  //    * - If the file has been uploaded (check by id), it will be added to the album
  //    * - If the file hasn't been uploaded, it will be uploaded and then added to the album
  //    *
  //    * Scenario 2.
  //    * If an album has been created, it will be used to add the files to the album
  //    * - If the file has been uploaded (check by id), it will be added to the album
  //    * - If the file hasn't been uploaded, it will be uploaded and then added to the album
  //    *
  //    * Scenario 3.
  //    * If album name is provided, it will used to create an album and all the files will be added to the album
  //    * - If the file has been uploaded (check by id), it will be added to the album
  //    * - If the file hasn't been uploaded, it will be uploaded and then added to the album
  //    *
  //    */

  //   if (albumCollection.size === 0) {
  //     ux.action.stop('No album to upload');
  //     return;
  //   }
  // }

  // async uploadOnce(toUpload: UploadTarget[], local: UploadTarget[]): Promise<void> {
  //   this.uploadEvent$.subscribe((e) => {
  //     ux.action.start('Upload', `\t [${e.remainder}/${toUpload.length}] \t ${e.fileName}`);
  //   });

  //   if (toUpload.length === 0) {
  //     ux.action.stop(`Found ${local.length} files at target directory, all have been uploaded!`);
  //     this.exit(0);
  //   } else {
  //     ux.action.stop(`Found ${local.length} files at target directory, ${toUpload.length} new files will be uploaded`);
  //   }

  //   let confirm = await ux.prompt('Proceed?(yes/no)', { type: 'normal' });

  //   while (confirm !== 'yes' && confirm !== 'no') {
  //     this.log('Please enter yes or no');
  //     confirm = await ux.prompt('Proceed?(yes/no)', { type: 'normal' });
  //   }

  //   if (confirm === 'yes') {
  //     await this.uploadService.uploadFiles(toUpload, this.uploadEvent$);
  //   }
  // }
}
import mime from 'mime-types';
import fs from 'node:fs';
import { ACCEPTED_MIME_TYPES, UploadTarget } from '../cores';
import { fdir, PathsOutput } from 'fdir';
import path from 'node:path';

const SUPPORTED_MIME_TYPES = [
  // IMAGES
  'image/heif',
  'image/heic',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/dng',
  'image/x-adobe-dng',
  'image/webp',
  'image/tiff',
  'image/nef',
  'image/x-nikon-nef',

  // VIDEO
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/3gpp',
];

export class CrawlService {
  public async crawl(pathsToCrawl: string[], recursive: boolean): Promise<string[]> {
    let crawler = new fdir().withFullPaths();

    if (!recursive) {
      // Don't go into subfolders
      crawler = crawler.withMaxDepth(0);
    }

    const crawledFiles: string[] = [];

    for (const crawlPath of pathsToCrawl) {
      try {
        // Check if the path can be accessed
        fs.accessSync(crawlPath);
      } catch (error) {
        throw new Error('Unable to access path ' + crawlPath + ': ' + error);
      }

      const pathStats = fs.lstatSync(crawlPath);

      if (pathStats.isDirectory()) {
        // Path is a directory so use the crawler to crawl it (potentially very large list)
        const children = crawler.crawl(crawlPath).sync() as PathsOutput;
        for (const child of children) {
          crawledFiles.push(child);
        }
      } else {
        // Path is a single file
        crawledFiles.push(path.resolve(crawlPath));
      }
    }
  }

  public async buildUploadTarget(path: string): Promise<UploadTarget[]> {
    if (!fs.existsSync(path)) {
      throw new Error('Path does not exist');
    }

    const result: UploadTarget[] = [];

    const paths = (await new fdir().withFullPaths().crawl(path).withPromise()) as string[];

    for (const path of paths) {
      if (this.filterAcceptedFileType(path)) {
        result.push(new UploadTarget(path));
      }
    }

    return result;
  }

  public filterAcceptedFileType(path: string): boolean {
    return ACCEPTED_MIME_TYPES.includes(mime.lookup(path) as string);
  }
}
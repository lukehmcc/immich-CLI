import { Command, Flags, Interfaces } from '@oclif/core';
import { ImmichApi } from '../api/client';
import * as si from 'systeminformation';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand['baseFlags'] & T['flags']>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseFlags = {
    server: Flags.url({
      char: 's',
      summary: 'Server address (http://<your-ip>:2283/api or https://<your-domain>/api)',
      env: 'IMMICH_SERVER_ADDRESS',
      required: true,
      helpGroup: 'GLOBAL',
    }),
    key: Flags.string({
      char: 'k',
      summary: 'Immich API key',
      env: 'IMMICH_API_KEY',
      required: true,
      helpGroup: 'GLOBAL',
    }),
  };

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  protected immichApi!: ImmichApi;
  protected deviceId!: string;

  public async init(): Promise<void> {
    await super.init();

    try {
      const { args, flags } = await this.parse({
        flags: this.ctor.flags,
        baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
        args: this.ctor.args,
        strict: this.ctor.strict,
      });

      this.flags = flags as Flags<T>;
      this.args = args as Args<T>;
      this.deviceId = (await si.uuid()).os || 'CLI';
      this.immichApi = new ImmichApi(this.flags.server, this.flags.key);

      // Check if server and api key are valid
      this.immichApi.userApi.getMyUserInfo().catch((error) => {
        this.error(`Failed to connect to the server: ${error.message}`);
      });
    } catch {
      this.error('Error', {
        exit: 1,
        suggestions: ["Use --help to see the command's usage"],
      });
    }
  }
}

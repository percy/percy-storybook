declare module '@percy-io/percy-storybook' {

  import { RenderFunction, StoryBucket } from '@storybook/react';

  export interface PercyOptions {
    rtl?: boolean;
    widths?: number[];
    skip?: boolean;
  }

  export interface PercyAddon {
    addWithPercyOptions(storyName: string, storyFn: RenderFunction): this;
    addWithPercyOptions(storyName: string, options: PercyOptions, storyFn: RenderFunction): this;
  }

  export interface PercyAddonContext {
    serializeStories(getStorybook: () => StoryBucket[]): StoryBucket[];
    percyAddon: PercyAddon;
  }

  export default function createPercyAddon(): PercyAddonContext;
}

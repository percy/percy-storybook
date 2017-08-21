declare module '@percy-io/react-percy-storybook' {

  import { RenderFunction, StoryBucket } from '@storybook/react';

  export interface PercyOptions {
    rtl?: boolean;
    widths?: number[];
  }

  export interface PercyAddon {
    addWithPercyOptions(storyName: string, options: PercyOptions | RenderFunction, storyFn?: RenderFunction): this;
  }

  export interface PercyAddonContext {
    serializeStories(getStorybook: () => StoryBucket[]): StoryBucket[];
    percyAddon: PercyAddon;
  }

  export default function createPercyAddon(): PercyAddonContext;
}

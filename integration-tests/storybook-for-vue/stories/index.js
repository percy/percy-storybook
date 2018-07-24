import { storiesOf } from '@storybook/vue';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import MyButton from './MyButton.vue';
import Welcome from './Welcome.vue';
import Assets from './Assets.vue';

storiesOf('Welcome', module).add('to Storybook', () => ({
  components: { Welcome },
  template: '<welcome :showApp="action" />',
  methods: { action: linkTo('Button') },
}));

storiesOf('Button', module)
  .add('with text', () => ({
    components: { MyButton },
    template: '<my-button @click="action">Hello Button</my-button>',
    methods: { action: action('clicked') },
  }))
  .add('with some emoji', () => ({
    components: { MyButton },
    template: '<my-button @click="action">😀 😎 👍 💯</my-button>',
    methods: { action: action('clicked') },
  }));

storiesOf('Duplicate assets', module).add('registers the assets as different resources', () => ({
  components: { Assets },
  template: '<assets />',
}));

storiesOf('addWithPercyOptions', module)
  .addWithPercyOptions('multiple widths', { widths: [222, 333] }, () => ({
    components: { MyButton },
    template: '<my-button @click="action">I have snapshots in multiple widths</my-button>',
    methods: { action: action('clicked') },
  }))
  .addWithPercyOptions('single width', { widths: [444] }, () => ({
    components: { MyButton },
    template: '<my-button @click="action">I have snapshots in a single width</my-button>',
    methods: { action: action('clicked') },
  }))
  .addWithPercyOptions('skipped', { skip: true }, () => ({
    components: { MyButton },
    template: '<my-button @click="action">I will not render</my-button>',
    methods: { action: action('clicked') },
  }));

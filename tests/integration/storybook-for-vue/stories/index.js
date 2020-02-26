import { storiesOf } from '@storybook/vue';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import MyButton from './MyButton.vue';
import Welcome from './Welcome.vue';

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

storiesOf('addWithPercyOptions', module)
  .add(
    'multiple widths',
    () => ({
      components: { MyButton },
      template: '<my-button @click="action">I have snapshots in multiple widths</my-button>',
      methods: { action: action('clicked') },
    }),
    { percy: { widths: [222, 333] } },
  )
  .add(
    'single width',
    () => ({
      components: { MyButton },
      template: '<my-button @click="action">I have snapshots in a single width</my-button>',
      methods: { action: action('clicked') },
    }),
    { percy: { widths: [444] } },
  )
  .add(
    'skipped',
    () => ({
      components: { MyButton },
      template: '<my-button @click="action">I will not render</my-button>',
      methods: { action: action('clicked') },
    }),
    { percy: { skip: true } },
  );

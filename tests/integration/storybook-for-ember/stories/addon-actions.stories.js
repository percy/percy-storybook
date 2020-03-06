import hbs from 'htmlbars-inline-precompile';
import { storiesOf } from '@storybook/ember';
import { action } from '@storybook/addon-actions';

storiesOf('Addon|Actions', module)
  .addParameters({ options: { selectedAddonPanel: 'storybook/actions/actions-panel' } })
  .add('button', () => ({
    template: hbs`<button {{action onClick}}>Click Me</button>`,
    context: {
      onClick: action('clicked'),
    },
  }));

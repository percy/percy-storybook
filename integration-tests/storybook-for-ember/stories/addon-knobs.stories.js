import hbs from 'htmlbars-inline-precompile';
import { storiesOf } from '@storybook/ember';
import { withKnobs, text, color } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';

storiesOf('Addon|Knobs', module)
  .addDecorator(withKnobs)
  .addParameters({ options: { selectedAddonPanel: 'storybooks/storybook-addon-knobs' } })
  .add('with text', () => ({
    template: hbs`
      {{welcome-banner
        backgroundColor=backgroundColor
        titleColor=titleColor
        subTitleColor=subTitleColor
        title=title
        subtitle=subtitle
        click=(action onClick)
      }}
    `,
    context: {
      backgroundColor: color('backgroundColor', '#FDF4E7'),
      titleColor: color('titleColor', '#DF4D37'),
      subTitleColor: color('subTitleColor', '#B8854F'),
      title: text('title', 'Welcome to storybook'),
      subtitle: text('subtitle', 'This environment is completely editable'),
      onClick: action('clicked'),
    },
  }));

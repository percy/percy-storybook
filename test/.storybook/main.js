let storybookVersion = process.env.STORYBOOK_VERSION || '6';
let config = {
  stories: ['*.stories.js'],
  features: {
    postcss: false
  }
};

if(storybookVersion === '7'){
  config['framework'] = {
    name: '@storybook/react-webpack5',
    options: {}
  }
}

module.exports = config
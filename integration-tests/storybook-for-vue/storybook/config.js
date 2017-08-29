import { configure, getStorybook, setAddon } from '@storybook/vue';
import createPercyAddon from '@percy-io/percy-storybook';

import Vue from 'vue';
import Vuex from 'vuex';

// Install Vue plugins.
Vue.use(Vuex);

function loadStories() {
  require('../stories');
}

const { percyAddon, serializeStories } = createPercyAddon();

// You will only need this if you plan on using addWithPercyOptions
// addWithPercyOptions can be used to set options for individual stories (i.e. custom widths or RTL settings)
setAddon(percyAddon);

configure(loadStories, module);

serializeStories(getStorybook);

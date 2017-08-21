import { EntryNames } from '@percy-io/react-percy-webpack';
import getHTML from '../getHTML';

it('generates HTML with all stylesheets and the three entry scripts', () => {
  const assets = {
    '/static/styles1.css': 'styles 1 CSS',
    '/static/styles2.css': 'styles 2 CSS',
    [`/static/${EntryNames.framework}.js`]: 'framework JS',
    [`/static/${EntryNames.render}.js`]: 'render JS',
    [`/static/${EntryNames.snapshots}.js`]: 'snapshots JS',
    '/static/other.js': 'other JS',
    '/static/foo.jpg': 'foo JPG',
  };

  const html = getHTML(assets);

  expect(html).toMatchSnapshot();
});

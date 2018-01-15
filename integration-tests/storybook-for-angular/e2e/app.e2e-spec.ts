import {} from 'jasmine';
import { AppPage } from './app.po';

describe('storybook-for-angular App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect<any>(page.getParagraphText()).toEqual('Welcome to app!');
  });
});

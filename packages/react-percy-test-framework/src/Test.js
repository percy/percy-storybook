import normalizeSizes from './normalizeSizes';

export default class Test {

  constructor(title, fn, sizes = []) {
    if (typeof title !== 'string') {
      throw new Error(`\`title\` should be a "string", but "${typeof title}" was given`);
    }

    if (typeof fn !== 'function') {
      throw new Error(`\`fn\` should be a "function", but "${typeof fn}" was given`);
    }

    this.title = title;
    this.fn = fn;
    this.sizes = normalizeSizes(sizes);
  }

  fullTitle() {
    if (this.parent) {
      const parentTitle = this.parent.fullTitle();
      if (parentTitle) {
        return `${parentTitle} - ${this.title}`;
      }
    }

    return this.title;
  }

  getSizes() {
    if (this.sizes.length === 0 && this.parent) {
      return this.parent.getSizes();
    }

    return this.sizes;
  }

  async getTestCase() {
    return {
      name: this.fullTitle(),
      markup: await this.fn(),
      sizes: this.getSizes()
    };
  }

}

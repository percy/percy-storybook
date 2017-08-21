export default class Snapshot {
  constructor(title, options, fn) {
    if (typeof title !== 'string') {
      throw new Error(`\`title\` should be a "string", but "${typeof title}" was given`);
    }

    if (typeof options === 'function' && typeof fn === 'undefined') {
      fn = options;
      options = undefined;
    }

    if (typeof options !== 'object' && typeof options !== 'undefined') {
      throw new Error(`\`options\` should be an "object", but "${typeof options}" was given`);
    }

    this.title = title;
    this.fn = fn;
    this.options = options || {};
  }

  fullTitle() {
    if (this.parent) {
      const parentTitle = this.parent.fullTitle();
      if (parentTitle) {
        return `${parentTitle}: ${this.title}`;
      }
    }

    return this.title;
  }

  getOptions() {
    if (this.parent) {
      return {
        ...this.parent.getOptions(),
        ...this.options,
      };
    }

    return this.options;
  }

  getDefinition() {
    if (!this.fn) {
      return;
    }

    return {
      name: this.fullTitle(),
      options: this.getOptions(),
    };
  }

  async getMarkup() {
    return await this.fn();
  }
}

import { validateStoryArgs, encodeStoryArgs, decodeStoryArgs } from '../src/utils.js';

describe('Unit /', () => {
  describe('validateStoryArgs', () => {
    it('returns false when the key is empty or invalid', () => {
      expect(validateStoryArgs(null, 'value')).toBe(false);
      expect(validateStoryArgs(undefined, 'value')).toBe(false);
      expect(validateStoryArgs('', 'value')).toBe(false);
      expect(validateStoryArgs('!@#$', 'value')).toBe(false);
    });

    it('returns true when the value is null or undefined', () => {
      expect(validateStoryArgs('key', null)).toBe(true);
      expect(validateStoryArgs('key', undefined)).toBe(true);
    });

    it('returns true when the value is a date instance', () => {
      expect(validateStoryArgs('key', new Date())).toBe(true);
    });

    it('returns true when the value is a number or boolean', () => {
      expect(validateStoryArgs('key', 34.5)).toBe(true);
      expect(validateStoryArgs('key', 123_456)).toBe(true);
      expect(validateStoryArgs('key', false)).toBe(true);
    });

    it('returns true or false for valid string values', () => {
      expect(validateStoryArgs('key', '_some_ string-value')).toBe(true);
      expect(validateStoryArgs('key', '<special %chars &not *valid"')).toBe(false);
    });

    it('returns true or false for valid items in an array or object', () => {
      expect(validateStoryArgs('key', [1, '2', false, null])).toBe(true);
      expect(validateStoryArgs('key', [1, '%', true, null])).toBe(false);
      expect(validateStoryArgs('key', { a: '1', b: undefined })).toBe(true);
      expect(validateStoryArgs('key', { a: '@', b: undefined })).toBe(false);
    });

    it('returns false when unrecognized', () => {
      expect(validateStoryArgs('key', () => {})).toBe(false);
    });
  });

  describe('encodeStoryArgs', () => {
    it('encodes null and undefined values', () => {
      expect(encodeStoryArgs(null)).toBe('!null');
      expect(encodeStoryArgs(undefined)).toBe('!undefined');
    });

    it('encodes date values', () => {
      expect(encodeStoryArgs(new Date('2022-01-01T00:00Z')))
        .toBe('!date(2022-01-01T00:00:00.000Z)');
    });

    it('encodes short and long hex colors with or without alpha values', () => {
      expect(encodeStoryArgs('#012')).toBe('!hex(012)');
      expect(encodeStoryArgs('#abcd')).toBe('!hex(abcd)');
      expect(encodeStoryArgs('#012345')).toBe('!hex(012345)');
      expect(encodeStoryArgs('#6789abcd')).toBe('!hex(6789abcd)');
    });

    it('encodes rgb and hsl colors with or without alpha values', () => {
      expect(encodeStoryArgs('rgb(10, 20, 30)')).toBe('!rgb(10,20,30)');
      expect(encodeStoryArgs('rgba(10, 20, 30, 0.2)')).toBe('!rgba(10,20,30,0.2)');
      expect(encodeStoryArgs('hsl(120, 80%, 40%)')).toBe('!hsl(120,80,40)');
      expect(encodeStoryArgs('hsla(120, 80%, 40%, 0.5)')).toBe('!hsla(120,80,40,0.5)');
    });

    it('encodes values within arrays and objects', () => {
      expect(encodeStoryArgs([null, undefined, new Date('2022-01-01T00:00Z')]))
        .toEqual(['!null', '!undefined', '!date(2022-01-01T00:00:00.000Z)']);
      expect(encodeStoryArgs({ hex: '#f60', col: 'rgb(100, 0, 200)' }))
        .toEqual({ hex: '!hex(f60)', col: '!rgb(100,0,200)' });
    });

    it('does not encode unrecognized values', () => {
      expect(encodeStoryArgs(true)).toBe(true);
      expect(encodeStoryArgs(false)).toBe(false);
      expect(encodeStoryArgs(123_456)).toBe(123_456);
      expect(encodeStoryArgs('string')).toBe('string');
      // normally fail validation, but here to test they don't get accidentally encoded
      expect(encodeStoryArgs('#notahex')).toBe('#notahex');
      expect(encodeStoryArgs('rgb(1500)')).toBe('rgb(1500)');
    });
  });

  describe('decodeStoryArgs', () => {
    it('reverses encoding for most values', () => {
      let test = { test: [null, undefined, new Date(), '#6cf', true, 123_456, 'string'] };
      expect(decodeStoryArgs(encodeStoryArgs(test))).toEqual(test);
    });

    it('reconstructs rgb and hsl colors from encoded values', () => {
      expect(decodeStoryArgs('!rgb(20,40,60)')).toBe('rgb(20, 40, 60)');
      expect(decodeStoryArgs('!hsla(240,60,30,0.8)')).toBe('hsla(240, 60%, 30%, 0.8)');
    });

    it('decodes numbers from strings', () => {
      expect(decodeStoryArgs('67.89')).toBe(67.89);
    });
  });
});

/* eslint @typescript-eslint/naming-convention: 0 */
export class RegexPatterns {
  static CLASS_DEFINITION_START = /^(class|export class|export default class) \w/;
  static CLASS_PROPERTY = /^[a-z]([\w\d]+)?\??: [a-z][\w\d]+;/;
  static STATIC_CLASS_PROPERTY = /^static [a-z]([\w\d]+)?\??: [a-z][\w\d]+;/;

}
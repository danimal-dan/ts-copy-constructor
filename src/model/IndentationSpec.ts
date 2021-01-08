export class IndentationSpec {
  useSpaces: boolean = true;
  /**
   * If spaces, number of spaces to use for indentation
   */
  indentSize: number = 0;

  constructor(useSpaces = true, indentSize = 0) {
    this.useSpaces = useSpaces;
    this.indentSize = indentSize;
  }
}
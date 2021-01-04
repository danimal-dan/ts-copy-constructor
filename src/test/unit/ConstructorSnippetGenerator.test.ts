import { IndentationSpec } from '../../model/IndentationSpec';
import { Declarations } from '../../model/Declarations';
import { ConstructorSnippetGenerator } from '../../generator/ConstructorSnippetGenerator';
import { strictEqual } from 'assert';
import { TypescriptParser } from 'typescript-parser';

const parser = new TypescriptParser();
const twoSpacesIndentationSpec = new IndentationSpec(true, 2);

describe('ConstructorSnipperGenerator.ts', async function() {
  it('should generate constructor for class with a single string property', async function() {

    const sampleClass = 
`export class TestClass {
  string?: String;
}`;
    
    const activeDocumentParseResult = await parser.parseSource(sampleClass);

    const declarations = new Declarations(activeDocumentParseResult);

    const snippetGenerator = new ConstructorSnippetGenerator(declarations, twoSpacesIndentationSpec);

    const generatedSnippet = snippetGenerator.generateSnippet();

    const expectedOutput = 
`  constructor(opts?: Partial<TestClass>) {
    if (opts?.string != null) {
      this.string = opts.string;
    }
  }`;
    
    strictEqual(expectedOutput, generatedSnippet);
  });
});
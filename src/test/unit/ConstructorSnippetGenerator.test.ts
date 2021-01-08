import { IndentationSpec } from '../../model/IndentationSpec';
import { Declarations } from '../../model/Declarations';
import { ConstructorSnippetGenerator } from '../../generator/ConstructorSnippetGenerator';
import { strictEqual } from 'assert';
import { TypescriptParser } from 'typescript-parser';

const parser = new TypescriptParser();
const twoSpacesIndentationSpec = new IndentationSpec(true, 2);

describe('ConstructorSnipperGenerator.ts', async function() {
  it('should generate constructor with a single string property', async function() {

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

  it('should generate constructor with a single number property', async function() {

    const sampleClass = 
`export class TestClass {
  number?: Number;
}`;
    
    const activeDocumentParseResult = await parser.parseSource(sampleClass);

    const declarations = new Declarations(activeDocumentParseResult);

    const snippetGenerator = new ConstructorSnippetGenerator(declarations, twoSpacesIndentationSpec);

    const generatedSnippet = snippetGenerator.generateSnippet();

    const expectedOutput = 
`  constructor(opts?: Partial<TestClass>) {
    if (opts?.number != null) {
      this.number = opts.number;
    }
  }`;
    
    strictEqual(expectedOutput, generatedSnippet);
  });

  it('should generate constructor for array of strings property', async function() {

    const sampleClass = 
`export class TestClass {
  string: String[] = [];
}`;
    
    const activeDocumentParseResult = await parser.parseSource(sampleClass);

    const declarations = new Declarations(activeDocumentParseResult);

    const snippetGenerator = new ConstructorSnippetGenerator(declarations, twoSpacesIndentationSpec);

    const generatedSnippet = snippetGenerator.generateSnippet();

    const expectedOutput = 
`  constructor(opts?: Partial<TestClass>) {
    if (opts?.string != null) {
      this.string = [...opts.string];
    }
  }`;
    
    strictEqual(expectedOutput, generatedSnippet);
  });

  it('should generate constructor and instantiate object of known type', async function() {

    const sampleClass = 
`export class TestClass {
  testObject: TestObject;
}`;

    const testObjectClass = 
`export class TestObject {
  constructor(opts?: Partial<TestObject>) {

  }
}`;
    
    const activeDocumentParseResult = await parser.parseSource(sampleClass);

    const declarations = new Declarations(activeDocumentParseResult);

    const testObjectClassDeclaration = await parser.parseSource(testObjectClass);

    testObjectClassDeclaration.declarations.forEach(declaration => {
      if (declaration.name) {
          declarations.importsDeclarationMap.set(declaration.name, declaration);
      }
    });

    const snippetGenerator = new ConstructorSnippetGenerator(declarations, twoSpacesIndentationSpec);

    const generatedSnippet = snippetGenerator.generateSnippet();

    const expectedOutput = 
`  constructor(opts?: Partial<TestClass>) {
    if (opts?.testObject != null) {
      this.testObject = new TestObject(opts.testObject);
    }
  }`;
    
    strictEqual(expectedOutput, generatedSnippet);
  });

  it('should generate constructor and instantiate an array of objects of known type', async function() {

    const sampleClass = 
`export class TestClass {
  testObjects: TestObject[] = [];
}`;

    const testObjectClass = 
`export class TestObject {
  constructor(opts?: Partial<TestObject>) {

  }
}`;
    
    const activeDocumentParseResult = await parser.parseSource(sampleClass);

    const declarations = new Declarations(activeDocumentParseResult);

    const testObjectClassDeclaration = await parser.parseSource(testObjectClass);

    testObjectClassDeclaration.declarations.forEach(declaration => {
      if (declaration.name) {
          declarations.importsDeclarationMap.set(declaration.name, declaration);
      }
    });

    const snippetGenerator = new ConstructorSnippetGenerator(declarations, twoSpacesIndentationSpec);

    const generatedSnippet = snippetGenerator.generateSnippet();

    const expectedOutput = 
`  constructor(opts?: Partial<TestClass>) {
    if (opts?.testObjects != null) {
      this.testObjects = opts.testObjects.map(val => new TestObject(val));
    }
  }`;
    
    strictEqual(expectedOutput, generatedSnippet);
  });
});
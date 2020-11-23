# Typescript Copy Constructor Generator README

Typescript Copy Constructor adds a command "Insert Copy Constructor" to VS Code. When called, it will generate the code for a copy constructor in the active class.

## Example

Given:

```typescript
import { TestEnum } from "./TestEnum";
import { AnotherObject } from "./AnotherObject";

export class Test {
  type?: number;
  testEnum?: TestEnum;
  anObject?: AnotherObject;
  anObjectArray1?: Array<AnotherObject>;
  anObjectArray2?: AnotherObject[];
  primitiveArray?: string[];
  enumArray?: TestEnum[];
  bool?: boolean;
  string?: string;
}
```

After Command: Insert Copy Constructor

```typescript
export class Test {
  type?: number;
  testEnum?: TestEnum;
  anObject?: AnotherObject;
  anObjectArray1?: Array<AnotherObject>;
  anObjectArray2?: AnotherObject[];
  primitiveArray?: string[];
  enumArray?: TestEnum[];
  bool?: boolean;
  string?: string;

  constructor(opts?: Partial<Test>) {
    if (opts?.type != null) {
      this.type = opts.type;
    }
    if (opts?.testEnum != null) {
      if (typeof opts?.testEnum === "string") {
        this.testEnum = TestEnum[opts.testEnum];
      } else {
        this.testEnum = opts.testEnum;
      }
    }
    if (opts?.anObject != null) {
      this.anObject = new AnotherObject(opts.anObject);
    }
    if (opts?.anObjectArray1 != null) {
      this.anObjectArray1 = opts.anObjectArray1.map(
        (val) => new AnotherObject(val)
      );
    }
    if (opts?.anObjectArray2 != null) {
      this.anObjectArray2 = opts.anObjectArray2.map(
        (val) => new AnotherObject(val)
      );
    }
    if (opts?.primitiveArray != null) {
      this.primitiveArray = [...opts.primitiveArray];
    }
    if (opts?.enumArray != null) {
      this.enumArray = opts.enumArray.map((val) => {
        if (typeof val === "string") {
          return TestEnum[val];
        } else {
          return val;
        }
      });
    }
    if (opts?.bool != null) {
      this.bool = opts.bool;
    }
    if (opts?.string != null) {
      this.string = opts.string;
    }
  }
}
```

# Cases to Handle

- [ ] Prompt to override existing constructor
- [ ] Verify the file represents a typescript class
- [ ] Find best insert location for constructor if cursor is in a weird place, or outside of class definition.

# Planned Features

- [ ] Enable via Code Actions: https://github.com/microsoft/vscode-extension-samples/tree/master/code-actions-sample
- [ ] Enable via Completions: https://github.com/microsoft/vscode-extension-samples/tree/master/completions-sample
- [ ] Add support for ES6 Classes
- [ ] Add settings to specify how to initialize certain types.
  - Use case: A `moment` object, need to be `opts.date = moment(opts.date);`

## Extension Settings

No settings yet...

## Known Issues

Only works for Typescript properties. Does not handle initilization of non-optional properties that do not have a default value.

## Release Notes

Project is currently a WIP. It works for basic cases, but code needs to be cleaned up and some edge-cases need to be covered.

## Testing in VS Code

1. Open Project in VSCode
2. Install dependencies - `npm i`
3. Start `Run Extension` (defined in `launch.json`)
4. In new `[Extension Development Host]` window, create a ts type defintion (like example above)
5. Place cursor where you'd like constructor to be placed.
6. Open command palette and select `Insert Copy Constructor`

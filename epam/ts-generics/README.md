# Generics

## Task Description 

This task should take you about **2 hours**.   
Please be aware that the task is **mandatory**.   

- You must set all classes, function parameter types, and return types. 
- Please put all your code into a `src/index.ts` file.  
- All functions, interfaces, and classes must be defined as follows: 

    ```ts 
    function getProperty(/* parameters */) { 
        // your code 
    } 
 
    interface QueueInterface { 
        // your code 
    } 
 
    class Queue<T> implements QueueInterface { 
        // your code 
    } 
 
    export {Queue, getProperty}; 

    ``` 

1.  Generic types for a function with TypeScript:

Implement and describe types for a function that gets an object property. 
 
Example: 

```js 

  getProperty({test: 'testValue'}, 'test'); // 'testValue' 
  getProperty({2: [1,2,3]}, 2); // [1,2,3] 
  getProperty([{a: 0}, {a: 1}, {a: 2}], 2); // {a: 2} 

``` 

2. A class and an interface with TypeScript: 

Implement and describe types for the Queue class. 

The class should support all TypeScript types. 

Example: 

```js 
  const numberQueue = new Queue<number>(); 
  numberQueue.push(1); 
  numberQueue.push(2); 
  numberQueue.push(3); 
  numberQueue.pop(); // 1 
  numberQueue.getValue(); // [2,3] 

  const objectQueue = new Queue<{}>(); 
  objectQueue.push({first: 1}); 
  objectQueue.push({second: 2}); 
  objectQueue.pop(); // {first: 1} 
  objectQueue.getValue(); // [{second: 2}] 

``` 


## General Instructions

1. This practical task will be verified automatically with tests.
2. Please put all TypeScript code in the `src/index.ts` file. If you use any other file, we will not be able to verify it.
3. To transpile TypeScript, you have set up a tsconfig.json file with a set of rules. Please don't change it; this could affect your grade for the task. This configuration file includes a set of compilerOptions:

- ["strict"](https://www.typescriptlang.org/tsconfig#strict)
- ["forceConsistentCasingInFileNames"](https://www.typescriptlang.org/tsconfig#forceConsistentCasingInFileNames)
- ["strictFunctionTypes"](https://www.typescriptlang.org/tsconfig#strictFunctionTypes)
- ["noUnusedLocals"](https://www.typescriptlang.org/tsconfig#noUnusedLocals)
- ["noUnusedParameters"](https://www.typescriptlang.org/tsconfig#noUnusedParameters)
- ["noImplicitReturns"](https://www.typescriptlang.org/tsconfig#noImplicitReturns)
- Also we disallow using `any`.

## Verify your solution 

To be sure your solution is correct before submitting it, you can verify it locally, but this will require some local setup. Here are the instructions: [Verify your solution locally](https://gitlab.com/gap-bs-front-end-autocode-documents/autocode-documents/-/blob/main/docs/VerifySolutionLocally.md).

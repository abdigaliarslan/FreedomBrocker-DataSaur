import fsPromises from "fs/promises";
import path from "path";
import { ESLint } from "eslint";
import { parse, AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";
import { getRootLevelEntityByName } from "../test-utils/entityUtils";
import { tsCompile } from "../test-utils/tsCompile";
import { getProperty, Queue } from "./index";

// Helper function to merge ESLint configurations
function mergeConfigWithCommon(baseConfig) {
    const commonESLintConfig = {
        parser: "@typescript-eslint/parser",
        plugins: ["@typescript-eslint"],
    };
    return Object.assign({}, commonESLintConfig, baseConfig);
}

describe("Generics", () => {
    let fileContent;
    let fileESTree;
    let filePath;
    let fileHandle;
    let commonESLintConfig;
    let taskSolutionIsEmpty;

    beforeEach(async () => {
        filePath = path.resolve(__dirname, "index.ts");

        fileHandle = await fsPromises.open(filePath);
        fileContent = await fileHandle.readFile();
        const fileContentString = fileContent.toString();
        taskSolutionIsEmpty = !fileContentString || !fileContentString.trim();
        fileESTree = parse(fileContent, {
            loc: true,
            range: true,
        });

        commonESLintConfig = {
            parser: "@typescript-eslint/parser",
            plugins: ["@typescript-eslint"],
        };
    });

    afterEach(() => {
        fileHandle.close();
    });

    it("should not have TypeScript errors or warnings", () => {
        const diagnostics = tsCompile([filePath], fileContent);

        expect(taskSolutionIsEmpty).toBe(false);
        expect(diagnostics).toEqual("");
    });

    it("should not use explicit 'any'", async () => {
        const noExplicitAny = "@typescript-eslint/no-explicit-any";

        const rules = [noExplicitAny];

        const config = mergeConfigWithCommon({
            rules: {
                [noExplicitAny]: "error",
            },
        });

        const eslint = new ESLint({ baseConfig: config });

        const lintResult = await eslint.lintFiles(filePath);

        const allMessages = lintResult[0].messages;
        const errorMessages = allMessages.filter((message) =>
            rules.includes(message.ruleId)
        );

        if (errorMessages.length > 0) {
            console.error(errorMessages);
        }

        expect(taskSolutionIsEmpty).toBe(false);
        expect(errorMessages.length === 0).toBe(true);
    });

    describe("getProperty", () => {
        let functionTestEntity;

        beforeEach(() => {
            functionTestEntity = getRootLevelEntityByName({
                parentEntity: fileESTree,
                entityName: "getProperty",
                identifierPropKey: "id",
            });
        });

        it("should be a function declaration", () => {
            expect(functionTestEntity?.type).toBe(
                AST_NODE_TYPES.FunctionDeclaration
            );
        });

        it("should use generics for key extraction", () => {
            expect(functionTestEntity?.params.length).toBe(2);
            const keyType = functionTestEntity.params[1].typeAnnotation.typeAnnotation.type;
            expect(keyType).toBe(AST_NODE_TYPES.TSTypeReference);
        });

        it('should get string from object', () => {
            expect(getProperty({ test: 'testValue' }, 'test')).toBe('testValue');
        });

        it('should get array from object', () => {
            expect(getProperty({ 2: [1, 2, 3] }, 2)).toEqual([1, 2, 3]);
        });

        it('should get object from array', () => {
            expect(getProperty([{ a: 0 }, { a: 1 }, { a: 2 }], 2)).toEqual({ a: 2 });
        });

        it('should get object from object', () => {
            expect(getProperty({ a: 2, b: 3 }, 'b')).toBe(3);
        });

        it('should get value with key "3" from array', () => {
            expect(getProperty(['a', 'b', 'c', 'd'], 3)).toBe('d');
        });

        it('should get value with key "f" from object', () => {
            expect(getProperty({ a: 2, b: 3, f: 'test' }, 'f')).toBe('test');
        });

        it('should get value with key 1 from object', () => {
            expect(getProperty({ 1: 'a', 2: 'b', 3: 'c' }, 2)).toBe('b');
        });
    });

    describe("Queue", () => {
        let classTestEntity;

        beforeEach(() => {
            classTestEntity = getRootLevelEntityByName({
                parentEntity: fileESTree,
                entityName: "Queue",
                identifierPropKey: "id",
            });
        });

        it("should be a class declaration", () => {
            expect(classTestEntity.type).toBe(AST_NODE_TYPES.ClassDeclaration);
        });

        it("should use generics for queue items", () => {
            const typeParameters = classTestEntity.typeParameters;
            expect(typeParameters).toBeTruthy();
            expect(typeParameters.params.length).toBe(1);
            const itemType = typeParameters.params[0].name;
            expect(itemType.name).toBe("T");
        });

        it("should implement QueueInterface", () => {
            const implementedInterfaces = classTestEntity.implements;
            expect(implementedInterfaces.length).toBe(1);
            const interfaceName = implementedInterfaces[0].expression.name;
            expect(interfaceName).toBe("QueueInterface");
        });

        it("should return value of type string using generics", () => {
            const value= getProperty({ key: 'value' }, 'key');
            expect(value).toBe('value');
        });

        it("should return value of type number using generics", () => {
            const value = getProperty({ count: 42 }, 'count');
            expect(value).toBe(42);
        });

        it("should return value of type boolean using generics", () => {
            const value = getProperty({ isActive: true }, 'isActive');
            expect(value).toBe(true);
        });

        it("should return value of type array using generics", () => {
            const value = getProperty({ numbers: [1, 2, 3] }, 'numbers');
            expect(value).toEqual([1, 2, 3]);
        });

        it("should return value of type string from queue using generics", () => {
            const queue = new Queue();
            queue.push('first');
            queue.push('second');
            const value = queue.pop();
            expect(value).toBe('first');
        });
    });
});

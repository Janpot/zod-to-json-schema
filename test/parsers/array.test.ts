import { JSONSchema7Type } from "json-schema";
import { z } from "zod";
import { parseArrayDef } from "../../src/parsers/array";
import { getRefs } from "../../src/refs";
import { errorReferences } from "./errorReferences";
const deref = require("json-schema-deref-sync");

describe("Arrays and array validations", () => {
  it("should be possible to describe a simple array", () => {
    const parsedSchema = parseArrayDef(z.array(z.string())._def, getRefs());
    const jsonSchema: JSONSchema7Type = {
      type: "array",
      items: {
        type: "string",
      },
    };
    expect(parsedSchema).toStrictEqual(jsonSchema);
  });
  it("should be possible to describe a simple array with any item", () => {
    const parsedSchema = parseArrayDef(z.array(z.any())._def, getRefs());
    const jsonSchema: JSONSchema7Type = {
      type: "array",
    };
    expect(parsedSchema).toStrictEqual(jsonSchema);
  });
  it("should be possible to describe a string array with a minimum and maximum length", () => {
    const parsedSchema = parseArrayDef(
      z.array(z.string()).min(2).max(4)._def,
      getRefs()
    );
    const jsonSchema: JSONSchema7Type = {
      type: "array",
      items: {
        type: "string",
      },
      minItems: 2,
      maxItems: 4,
    };
    expect(parsedSchema).toStrictEqual(jsonSchema);
  });
  it("should be possible to describe a string array with a minimum length of 1 by using nonempty", () => {
    const parsedSchema = parseArrayDef(
      z.array(z.any()).nonempty()._def,
      getRefs()
    );
    const jsonSchema: JSONSchema7Type = {
      type: "array",
      minItems: 1,
    };
    expect(parsedSchema).toStrictEqual(jsonSchema);
  });

  it("should be possible do properly reference array items", () => {
    const willHaveBeenSeen = z.object({ hello: z.string() });
    const unionSchema = z.union([willHaveBeenSeen, willHaveBeenSeen]);
    const arraySchema = z.array(unionSchema);
    const jsonSchema = parseArrayDef(arraySchema._def, getRefs());
    //TODO: Remove 'any'-cast when json schema type package supports it. 'anyOf' in 'items' should be completely according to spec though.
    expect((jsonSchema.items as any).anyOf[1].$ref).toEqual("#/items/anyOf/0");

    const resolvedSchema = deref(jsonSchema);
    expect(resolvedSchema.items.anyOf[1]).toBe(resolvedSchema.items.anyOf[0]);
  });

  it("should include custom error messages for minLength and maxLength", () => {
    const minLengthMessage = "Must have at least 5 items.";
    const maxLengthMessage = "Can have at most 10 items.";
    const jsonSchema: JSONSchema7Type = {
      type: "array",
      minItems: 5,
      maxItems: 10,
      errorMessage: {
        minItems: minLengthMessage,
        maxItems: maxLengthMessage,
      },
    };
    const zodArraySchema = z
      .array(z.any())
      .min(5, minLengthMessage)
      .max(10, maxLengthMessage);
    const jsonParsedSchema = parseArrayDef(
      zodArraySchema._def,
      errorReferences()
    );
    expect(jsonParsedSchema).toStrictEqual(jsonSchema);
  });

  it("should not include errorMessages property if none are passed", () => {
    const jsonSchema: JSONSchema7Type = {
      type: "array",
      minItems: 5,
      maxItems: 10,
    };
    const zodArraySchema = z.array(z.any()).min(5).max(10);
    const jsonParsedSchema = parseArrayDef(
      zodArraySchema._def,
      errorReferences()
    );
    expect(jsonParsedSchema).toStrictEqual(jsonSchema);
  });
  it("should not include error messages if it isn't explicitly set to true in References constructor", () => {
    const zodSchemas = [
      z.array(z.any()).min(1, "bad"),
      z.array(z.any()).max(1, "bad"),
    ];
    for (const schema of zodSchemas) {
      const jsonParsedSchema = parseArrayDef(schema._def, getRefs());
      expect(jsonParsedSchema.errorMessages).toBeUndefined();
    }
  });
});

import { ZodStringDef } from "zod";
import { ErrorMessages, setResponseValueAndErrors } from "../errorMessages";
import { Refs } from "../Refs";

export type JsonSchema7StringType = {
  type: "string";
  minLength?: number;
  maxLength?: number;
  format?: "email" | "uri" | "uuid" | "date-time" | "ipv4" | "ipv6";
  pattern?: string;
  allOf?: {
    pattern: string;
    errorMessage?: ErrorMessages<{ pattern: string }>;
  }[];
  anyOf?: {
    format: string;
    errorMessage?: ErrorMessages<{ format: string }>;
  }[];
  errorMessage?: ErrorMessages<JsonSchema7StringType>;
};

export function parseStringDef(
  def: ZodStringDef,
  refs: Refs
): JsonSchema7StringType {
  const res: JsonSchema7StringType = {
    type: "string",
  };

  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(
            res,
            "minLength",
            typeof res.minLength === "number"
              ? Math.max(res.minLength, check.value)
              : check.value,
            check.message,
            refs
          );
          break;
        case "max":
          setResponseValueAndErrors(
            res,
            "maxLength",
            typeof res.maxLength === "number"
              ? Math.min(res.maxLength, check.value)
              : check.value,
            check.message,
            refs
          );

          break;
        case "email":
          addFormat(res, "email", check.message, refs);
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex.source, check.message, refs);
          break;
        case "cuid":
          addPattern(res, "^c[^\\s-]{8,}$", check.message, refs);
          break;
        case "cuid2":
          addPattern(res, "^[a-z][a-z0-9]*$", check.message, refs);
          break;
        case "startsWith":
          addPattern(
            res,
            "^" + escapeNonAlphaNumeric(check.value),
            check.message,
            refs
          );
          break;
        case "endsWith":
          addPattern(
            res,
            escapeNonAlphaNumeric(check.value) + "$",
            check.message,
            refs
          );
          break;

        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(
            res,
            "minLength",
            typeof res.minLength === "number"
              ? Math.max(res.minLength, check.value)
              : check.value,
            check.message,
            refs
          );
          setResponseValueAndErrors(
            res,
            "maxLength",
            typeof res.maxLength === "number"
              ? Math.min(res.maxLength, check.value)
              : check.value,
            check.message,
            refs
          );
          break;
        case "includes": {
          addPattern(
            res,
            escapeNonAlphaNumeric(check.value),
            check.message,
            refs
          );
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(
            res,
            "/^(p{Extended_Pictographic}|p{Emoji_Component})+$/u",
            check.message,
            refs
          );
          break;
        case "ulid": {
          addPattern(res, "/[0-9A-HJKMNP-TV-Z]{26}/", check.message, refs);
          break;
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          // I have no idea why these are checks in Zod 🤷
          break;
        default:
          ((_: never) => {})(check);
      }
    }
  }

  return res;
}

const escapeNonAlphaNumeric = (value: string) =>
  Array.from(value)
    .map((c) => (/[a-zA-Z0-9]/.test(c) ? c : `\\${c}`))
    .join("");

const addFormat = (
  schema: JsonSchema7StringType,
  value: Required<JsonSchema7StringType>["format"],
  message: string | undefined,
  refs: Refs
) => {
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }

    if (schema.format) {
      schema.anyOf!.push({
        format: schema.format,
        ...(schema.errorMessage &&
          refs.errorMessages && {
            errorMessage: { format: schema.errorMessage.format },
          }),
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }

    schema.anyOf!.push({
      format: value,
      ...(message &&
        refs.errorMessages && { errorMessage: { format: message } }),
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
};

const addPattern = (
  schema: JsonSchema7StringType,
  value: string,
  message: string | undefined,
  refs: Refs
) => {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }

    if (schema.pattern) {
      schema.allOf!.push({
        pattern: schema.pattern,
        ...(schema.errorMessage &&
          refs.errorMessages && {
            errorMessage: { pattern: schema.errorMessage.pattern },
          }),
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }

    schema.allOf!.push({
      pattern: value,
      ...(message &&
        refs.errorMessages && { errorMessage: { pattern: message } }),
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", value, message, refs);
  }
};

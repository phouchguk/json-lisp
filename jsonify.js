"use strict";

const fs = require("fs");

const STRING_ESC = "¬";
const COMMA_AT = STRING_ESC + "@";

const strings = [];

function extractStrings(x, i) {
  if (i % 2 === 0) {
    // not part of a string
    return x;
  } else {
    strings.push(x);
    return STRING_ESC + (i - 1) / 2;
  }
}

function tokenise(s) {
  strings.length = 0;

  const tokens = s
    .replace(/\\"/g, STRING_ESC)
    .split(/"/g)
    .map(extractStrings)
    .join("")
    .replace(/\[/g, "[quote [")
    .replace(/\]/g, "]]")
    .replace(/\(/g, "[")
    .replace(/\)/g, "]")
    .replace(/,@/g, " " + COMMA_AT + " ")
    .replace(/\[/g, " [ ")
    .replace(/\]/g, " ] ")
    .replace(/\{/g, " { ")
    .replace(/\}/g, " } ")
    .replace(/'/g, " ' ")
    .replace(/`/g, " ` ")
    .replace(/,/g, " , ")
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x !== "");

  return tokens;
}

const delims = {
  "'": "quote",
  "`": "bquote",
  ",": "comma",
};

delims[COMMA_AT] = "comma-at";

function getString(i) {
  return ["quote", strings[i]];
}

function parseSymbol(s) {
  if (s === "true") {
    return true;
  }

  if (s === "false") {
    return false;
  }

  if (s === "null") {
    return null;
  }

  if (s === "undefined") {
    return undefined;
  }

  return s;
}

function parseList(tx) {
  const a = [];

  for (;;) {
    const t = tx[0];

    if (tx.length === 0) {
      throw new Error("unterminated array");
    }

    if (t === "]") {
      tx.shift();
      return a;
    }

    a.push(parse(tx));
  }
}

function parseObj(tx) {
  const o = {};

  for (;;) {
    const t = tx[0];

    if (tx.length === 0) {
      throw new Error("unterminated obj");
    }

    if (t === "}") {
      tx.shift();
      return o;
    }

    o[tx.shift()] = parse(tx);
  }
}

function parse(tx) {
  const t = tx.shift();

  if (delims[t]) {
    return [delims[t], parse(tx)];
  }

  if (t === "[") {
    return parseList(tx);
  }

  if (t === "]") {
    throw new Error("bad ']'");
  }

  if (t === "{") {
    return parseObj(tx);
  }

  if (t === "}") {
    throw new Error("bad '}'");
  }

  if (t.startsWith(STRING_ESC)) {
    return getString(parseInt(t.substring(1), 10));
  }

  const n = parseInt(t, 10);

  if (isNaN(n)) {
    return parseSymbol(t);
  }

  return n;
}

const file = process.argv[2];
const code = fs.readFileSync(file + ".jsnl", { encoding: "utf8", flag: "r" });
const tokens = tokenise("(do " + code + ")");
fs.writeFileSync(file + ".json", JSON.stringify(parse(tokens)) + "\n");

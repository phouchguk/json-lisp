"use strict";

const {
  arrp,
  boolp,
  dop,
  fnp,
  ifp,
  jsfnp,
  macp,
  numberp,
  objp,
  primitivep,
  quotep,
  rawobjp,
  selfEvaluatingP,
  set,
  setp,
  symbolp,
  taggedArr,
  undefinedp,
  variablep,
  destruct,
  extendEnv,
  newCall
} = require("./core");

function analyzeSelfEvaluating(exp) {
  return function (env) {
    return exp;
  }
}

function analyzeQuoted(exp) {
  if (exp.length !== 2) {
    throw new Error("bad quote");
  }

  const qval = exp[1];

  return function (env) {
    return qval;
  }
}

function analyze(exp) {
  if (selfEvaluatingP(exp)) {
    return analyzeSelfEvaluating(exp);
  }

  if (quotep(exp)) {
    return analyzeQuoted(exp);
  }
}

function evl(exp, env) {
  return analyze(exp)(env);
}

console.log(evl(["quote", [1, 2, 3]], {}));

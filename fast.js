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
  newCall,
  env,
} = require("./core");

function analyzeSelfEvaluating(exp) {
  return function (env) {
    return exp;
  };
}

function analyzeQuoted(exp) {
  if (exp.length !== 2) {
    throw new Error("bad quote");
  }

  const qval = exp[1];

  return function (env) {
    return qval;
  };
}

function analyzeSet(exp) {
  const variable = exp[1];
  const vproc = analyze(exp[2]);

  return function (env) {
    return set(variable, vproc(env), env);
  };
}

function analyzeIf(exp) {
  if (exp.length !== 4) {
    throw new Error("bad if");
  }

  const pproc = analyze(exp[1]);
  const cproc = analyze(exp[2]);
  const aproc = analyze(exp[3]);

  return function (env) {
    if (pproc(env) === false) {
      return aproc(env);
    }

    return cproc(env);
  };
}

function analyze(exp) {
  if (selfEvaluatingP(exp)) {
    return analyzeSelfEvaluating(exp);
  }

  if (quotep(exp)) {
    return analyzeQuoted(exp);
  }

  if (variablep(exp)) {
    return function (env) {
      return lookup(exp, env);
    };
  }

  if (setp(exp)) {
    return analyzeSet(exp);
  }

  if (ifp(exp)) {
    return analyzeIf(exp);
  }
}

function evl(exp, env) {
  return analyze(exp)(env);
}

console.log(evl(["set", "a", 42], env));
console.log(env);

console.log(evl(["?", false, 42, 99], env));

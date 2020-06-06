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

function analyzeFn(exp) {
  const bodyLen = exp.length - 2; // rm fn tag and parms
  let body = false;

  if (bodyLen === 1) {
    body = exp[2];
  } else {
    body = exp.slice(2);
    body.unshift("do");
  }

  body = analyze(body);

  const clo = {
    parms: exp[1],
    body: body,
    parml: exp[1].indexOf(".") > -1 ? -1 : exp[1].length,
  };

  if (fnp(json)) {
    clo.clo = true;
  } else {
    clo.mac = true;
  }

  return function (env) {
    clo.env = env;
    return clo;
  };
}

function analyzeSeq(exps) {
  function sequentially(proc1, proc2) {
    return function (env) {
      proc1(env);
      return proc2(env);
    };
  }

  const expsl = exps.length;

  if (expsl === 0) {
    throw new Error("empty seq");
  }

  const lastIndex = expsl - 1;
  let proc = analyze(exps[0]);

  for (let i = 1; i < expsl; i++) {
    if (i === lastIndex) {
      return proc;
    }

    proc = sequentially(proc, analyze(exps[i]));
  }
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

  if (fnp(exp) || macp(exp)) {
    return analyzeFn(exp);
  }

  if (dop(exp)) {
    return analyzeSeq(exp.slice(1));
  }
}

function evl(exp, env) {
  return analyze(exp)(env);
}

console.log(evl(["set", "a", 42], env));
console.log(env);

console.log(evl(["?", false, 42, 99], env));

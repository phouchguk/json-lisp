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
  selfEvaluatingP,
  set,
  setp,
  setEval,
  symbolp,
  taggedArr,
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

  if (fnp(exp)) {
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

  if (expsl === 1) {
    return proc;
  }

  for (let i = 1; i < expsl; i++) {
    proc = sequentially(proc, analyze(exps[i]));

    if (i === lastIndex) {
      return proc;
    }
  }
}

function executeApplication(proc, args, isObj) {
  if (primitivep(proc)) {
    return proc.apply(null, args);
  }

  if (isObj && proc.clo) {
    return proc.body(extendEnv(proc, args));
  }

  if (proc === ".") {
    if (args[1][0] === "-") {
      // property access
      return args[0][args[1].substring(1)];
    } else {
      // method call
      return args[0][args[1]].apply(args[0], args.slice(2));
    }
  }

  if (proc === "new") {
    return newCall.apply(null, args);
  }

  const argl = args.length;

  if (!(argl === 1 || argl === 2)) {
    throw new Error("bad application arg count");
  }

  const isAssign = argl === 2;

  if (isObj) {
    // obj application
    if (!symbolp(args[0])) {
      throw new Error("bad object application");
    }

    if (isAssign) {
      proc[args[0]] = args[1];
      return "ok";
    }

    return proc[args[0]];
  }

  if (arrp(proc)) {
    if (!numberp(args[0])) {
      throw new Error("bad array application");
    }

    if (isAssign) {
      proc[args[0]] = args[1];
      return "ok";
    }

    return proc[args[0]];
  }

  if (numberp(proc)) {
    if (!arrp(args[0])) {
      throw new Error("bad number application");
    }

    if (isAssign) {
      args[0][proc] = args[1];
      return "ok";
    }

    return args[0][proc];
  }

  if (symbolp(proc)) {
    if (!objp(args[0])) {
      throw new Error("bad symbol application");
    }

    if (isAssign) {
      args[0][proc] = args[1];
      return "ok";
    }

    return args[0][proc];
  }

  throw new Error("bad json");
}

function executeMacro(op, aprocs, unevs, len, env) {
  const isObj = objp(op);

  if (isObj && op.mac) {
    const expansion = op.body(extendEnv(op, unevs));
    return evl(expansion, env);
  }

  const args = [];

  for (let i = 0; i < len; i++) {
    args[i] = aprocs[i](env);
  }

  return executeApplication(op, args, isObj);
}

function analyzeApplication(exp, len) {
  const fproc = analyze(exp[0]);
  const aprocs = [];

  for (let i = 1; i < len; i++) {
    aprocs[i - 1] = analyze(exp[i]);
  }

  len = len - 1;

  return function (env) {
    return executeMacro(fproc(env), aprocs, exp.slice(1), len, env);
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

  if (fnp(exp) || macp(exp)) {
    return analyzeFn(exp);
  }

  if (dop(exp)) {
    return analyzeSeq(exp.slice(1));
  }

  if (!arrp(exp)) {
    throw new Error("expected array");
  }

  const expl = exp.length;

  if (expl === 0) {
    throw new Error("bad empty array");
  }

  return analyzeApplication(exp, expl);
}

function evl(exp, env) {
  return analyze(exp)(env);
}

setEval(evl);

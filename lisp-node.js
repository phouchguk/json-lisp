var fs = require("fs");

function lookup(v, env) {
  for (;;) {
    if (typeof env[v] !== "undefined") {
      return env[v];
    }

    if (typeof env._parent === "undefined") {
      if (typeof global[v] === "undefined") {
        if (typeof module[v] === "undefined") {
          throw new Error("'" + v + "'unbound");
        }

        return module[v];
      }

      return global[v];
    }

    env = env._parent;
  }
}

evl(
  JSON.parse(fs.readFileSync("prelude.json", { encoding: "utf8", flag: "r" })),
  env
);
evl(
  JSON.parse(fs.readFileSync("test.json", { encoding: "utf8", flag: "r" })),
  env
);

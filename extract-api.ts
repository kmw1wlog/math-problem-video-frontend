import fs from "fs";
import path from "path";
import { globby } from "globby";
import { parse } from "@babel/parser";

import * as babelTraverse from "@babel/traverse";
import type { NodePath } from "@babel/traverse";

// ---- traverse 런타임 가드: function 내보내기 위치를 환경별로 안전하게 해석
const __trvAny: any = (babelTraverse as any);
const traverse: (ast: any, v: any) => void =
  (typeof __trvAny === "function") ? __trvAny :
  (typeof __trvAny.default === "function") ? __trvAny.default :
  (typeof __trvAny.default?.default === "function") ? __trvAny.default.default :
  (() => { throw new Error("Cannot resolve @babel/traverse export shape"); })();

import * as t from "@babel/types";


type Row = {
  method: string;
  url: string;
  file: string;
  line: number;
  bodyKeys: string[];
};

const AXIOS_INSTANCE_NAMES = new Set(["api", "apiClient", "http", "client"]);

function strOf(node?: t.Node | null): string {
  if (!node) return "";
  if (t.isStringLiteral(node)) return node.value;
  if (t.isTemplateLiteral(node)) {
    let s = "";
    node.quasis.forEach((q, i) => {
      s += q.value.cooked ?? "";
      const ex = node.expressions[i];
      if (ex) s += "${" + (t.isIdentifier(ex) ? ex.name : "expr") + "}";
    });
    return s;
  }
  if (t.isIdentifier(node)) return node.name;
  return "";
}

function getBodyKeys(node?: t.Node | null): string[] {
  if (!node || !t.isObjectExpression(node)) return [];
  return node.properties
    .filter((p): p is t.ObjectProperty => t.isObjectProperty(p))
    .map(p => (t.isIdentifier(p.key) ? p.key.name : (t.isStringLiteral(p.key) ? p.key.value : "")))
    .filter(Boolean);
}

(async () => {
  const files = await globby(["src/**/*.{ts,tsx,js,jsx}"]);
  const rows: Row[] = [];

  // 1) axios.create ?몄뒪?댁뒪 baseURL ?섏쭛
  const axiosBase: Record<string, string> = {};

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });

    traverse(ast, {
      CallExpression(path: NodePath<t.CallExpression>) {
        const n = path.node;

        // axios.create(...)
        if (
          t.isMemberExpression(n.callee) &&
          t.isIdentifier(n.callee.object, { name: "axios" }) &&
          t.isIdentifier(n.callee.property, { name: "create" })
        ) {
          const parent = path.parentPath?.parentPath?.node;
          if (parent && t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
            const inst = parent.id.name;
            const arg = n.arguments[0];
            if (arg && t.isObjectExpression(arg)) {
              const baseProp = arg.properties.find(
                p => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: "baseURL" })
              ) as t.ObjectProperty | undefined;
              if (baseProp) {
                axiosBase[inst] = strOf(baseProp.value).replace(/^['"`]|['"`]$/g, "");
              }
            }
          }
        }
      }
    });
  }

  // 2) ?몄텧 異붿텧
  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });

    traverse(ast, {
      CallExpression(path: NodePath<t.CallExpression>) {
        const n = path.node;
        const loc = n.loc?.start?.line ?? 0;

        // fetch(url, opts?)
        if (t.isIdentifier(n.callee, { name: "fetch" })) {
          const urlExpr = strOf(n.arguments[0] as t.Node);
          let method = "GET";
          let bodyKeys: string[] = [];

          const opts = n.arguments[1];
          if (opts && t.isObjectExpression(opts)) {
            for (const p of opts.properties) {
              if (t.isObjectProperty(p) && t.isIdentifier(p.key, { name: "method" }) && t.isStringLiteral(p.value)) {
                method = p.value.value.toUpperCase();
              }
              if (t.isObjectProperty(p) && t.isIdentifier(p.key, { name: "body" })) {
                bodyKeys = getBodyKeys(p.value);
              }
            }
          }
          rows.push({ method, url: urlExpr, file, line: loc, bodyKeys });
          return;
        }

        // axios.* / <instance>.* (get/post/put/patch/delete)
        if (t.isMemberExpression(n.callee) && t.isIdentifier(n.callee.property)) {
          const m = n.callee.property.name.toUpperCase();
          if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) return;

          // axios.get(...)
          if (t.isIdentifier(n.callee.object, { name: "axios" })) {
            const urlExpr = strOf(n.arguments[0] as t.Node);
            const dataArg = n.arguments[1];
            const bodyKeys = getBodyKeys(dataArg as t.Node);
            rows.push({ method: m, url: urlExpr, file, line: loc, bodyKeys });
            return;
          }

          // api.get(...)  (axios.create ?몄뒪?댁뒪)
          // api.get(...)  (axios.create ?몄뒪?댁뒪)
            if (t.isIdentifier(n.callee.object)) {
                const obj = n.callee.object as t.Identifier;   // <= ?뺤떎??醫곹엳湲?
                const inst = obj.name;
            
                if (AXIOS_INSTANCE_NAMES.has(inst) || axiosBase[inst]) {
                const urlExpr = strOf(n.arguments[0] as t.Node);
                const dataArg = n.arguments[1];
                const bodyKeys = getBodyKeys(dataArg as t.Node);
                const base = axiosBase[inst];
                const finalUrl =
                    base && urlExpr && !/^https?:\/\//i.test(urlExpr)
                    ? (base.endsWith("/") || urlExpr.startsWith("/")
                        ? base + urlExpr.replace(/^\//, "")
                        : `${base}/${urlExpr}`)
                    : urlExpr;
            
                rows.push({ method: m, url: finalUrl || urlExpr, file, line: loc, bodyKeys });
                }
                return; // Identifier媛 ?꾨땶 寃쎌슦 ?꾨옒濡??⑥뼱吏吏 ?딄쾶
            } else {
                return; // 議곌린 醫낅즺濡?????덉쟾
            }
            
        }
      }
    });
  }

  // ??? JSON
  fs.writeFileSync("api-spec.json", JSON.stringify(rows, null, 2), "utf8");

  // ??? CSV
  const csv = [
    "method,url,file,line,bodyKeys",
    ...rows.map(r =>
      [
        r.method,
        `"${(r.url || "").replace(/"/g, '""')}"`,
        `"${r.file.replace(/"/g, '""')}"`,
        r.line,
        `"${(r.bodyKeys || []).join("|").replace(/"/g, '""')}"`
      ].join(",")
    )
  ].join("\n");
  fs.writeFileSync("api-spec.csv", csv, "utf8");

  console.log(`??Done. Found ${rows.length} calls ??api-spec.json / api-spec.csv`);
})();



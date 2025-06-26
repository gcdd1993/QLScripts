/**
 * 夸父资源社签到脚本
 *
 * @description 自动完成夸父资源社的每日签到
 * @author AI Assistant
 * @version 1.0.0
 * @license MIT
 *
 * 变量名：KUAFU_COOKIE
 * 格式：完整的Cookie字符串，包含bbs_sid、bbs_token等必要信息
 * 多账号：使用@分隔多个Cookie
 *
 * cron: 0 8 * * *  # 每天上午8点执行
 */

// {{CHENGQI:
// Action: Added
// Timestamp: [2025-01-27 11:45:00 +08:00]
// Reason: 创建基础脚本结构，实现P3-LD-001检查清单项
// Principle_Applied: KISS(保持简洁), SRP(单一职责), DRY(复用现有架构)
// Optimization: 参考项目中成熟的脚本结构设计
// Architectural_Note (AR): 采用与项目其他脚本一致的架构模式，确保可维护性
// Documentation_Note (DW): 添加详细的文档注释，便于用户理解和配置
// }}

const $ = new Env("夸父资源社签到");

// 配置常量
const CONFIG = {
  name: "夸父资源社",
  baseUrl: "https://kuafuzys.com",
  signUrl: "https://kuafuzys.com/my-sign.htm",
  timeout: 10000,
  retryTimes: 3,
  retryDelay: 2000,
};

// 环境变量名
const ENV_NAME = "KUAFU_COOKIE";

/**
 * 主函数入口
 * 遵循SRP原则：负责统筹整个签到流程
 */
async function main() {
  console.log(`\n======== ${CONFIG.name}签到脚本开始 ========`);

  try {
    // 获取Cookie配置
    const cookies = getCookies();
    if (!cookies || cookies.length === 0) {
      console.log(`❌ 未找到有效的Cookie配置，请设置环境变量 ${ENV_NAME}`);
      return;
    }

    console.log(`📱 共找到 ${cookies.length} 个账号`);

    // 处理每个账号的签到
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      console.log(`\n--- 账号 ${i + 1} 开始签到 ---`);

      await processAccount(cookie, i + 1);

      // 多账号间延时，避免请求过于频繁
      if (i < cookies.length - 1) {
        await wait(1000);
      }
    }
  } catch (error) {
    console.log(`❌ 脚本执行出现异常: ${error.message}`);
  } finally {
    console.log(`\n======== ${CONFIG.name}签到脚本结束 ========\n`);
  }
}

/**
 * 获取Cookie配置
 * 遵循SRP原则：专门负责Cookie的获取和预处理
 * @returns {Array} Cookie数组
 */
function getCookies() {
  // 从环境变量获取Cookie
  let cookieStr = process.env[ENV_NAME] || $.getdata(ENV_NAME) || "";

  if (!cookieStr) {
    return [];
  }

  // 支持多账号，使用@分隔
  return cookieStr.split("@").filter((cookie) => cookie.trim());
}

/**
 * 处理单个账号的签到
 * 遵循SRP原则：专门处理单账号签到逻辑
 * @param {string} cookie Cookie字符串
 * @param {number} index 账号序号
 */
async function processAccount(cookie, index) {
  try {
    console.log(`🔍 开始验证账号 ${index} 的Cookie: ${maskCookie(cookie)}`);

    // 验证Cookie格式
    const validation = validateCookie(cookie);
    if (!validation.valid) {
      console.log(`❌ 账号 ${index} Cookie验证失败: ${validation.error}`);
      return;
    }

    // 执行签到
    const result = await performSignIn(cookie);

    if (result.success) {
      console.log(`✅ 账号 ${index} 签到成功: ${result.message}`);
    } else {
      console.log(`❌ 账号 ${index} 签到失败: ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ 账号 ${index} 处理失败: ${error.message}`);
  }
}

// {{CHENGQI:
// Action: Added
// Timestamp: [2025-01-27 11:50:00 +08:00]
// Reason: 实现P3-LD-002检查清单项 - HTTP请求核心功能
// Principle_Applied: DRY(复用请求逻辑), Open/Closed(可扩展配置), SRP(职责分离)
// Optimization: 基于curl命令设计的精确HTTP请求实现
// Architectural_Note (AR): 模块化设计，便于测试和维护
// Documentation_Note (DW): 添加详细的请求参数说明和错误处理逻辑
// }}

// {{CHENGQI:
// Action: Modified
// Timestamp: 2024-12-19 17:40:00 +08:00
// Reason: Per P3-LD-003 增强Cookie管理和验证功能
// Principle_Applied: SRP (单一职责-Cookie验证), KISS (简洁验证逻辑), DRY (复用现有功能)
// Optimization: 完善验证逻辑，增加安全检查和详细错误信息
// Architectural_Note (AR): Cookie管理遵循安全最佳实践，确保敏感信息保护
// Documentation_Note (DW): Cookie验证逻辑已更新，增强了安全性和错误处理
// }}

/**
 * 验证Cookie格式是否有效（增强版本）
 * 遵循SRP原则：专门负责Cookie验证逻辑
 * @param {string} cookie Cookie字符串
 * @returns {Object} 验证结果对象 {valid: boolean, error?: string, message?: string}
 */
function validateCookie(cookie) {
  if (!cookie || typeof cookie !== "string") {
    const error = "Cookie不能为空且必须是字符串类型";
    console.log(`❌ Cookie验证失败: ${error}`);
    return { valid: false, error };
  }

  // 检查必需的Cookie字段
  const requiredFields = ["bbs_sid", "bbs_token"];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!cookie.includes(`${field}=`)) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    const error = `Cookie缺少必需字段: ${missingFields.join(", ")}`;
    console.log(`❌ Cookie验证失败: ${error}`);
    return { valid: false, error };
  }

  // 检查Cookie格式（基础格式验证）
  const cookiePairs = cookie.split(";").map((pair) => pair.trim());
  for (const pair of cookiePairs) {
    if (pair && !pair.includes("=")) {
      const error = `Cookie格式错误: "${pair}" 不是有效的key=value格式`;
      console.log(`❌ Cookie验证失败: ${error}`);
      return { valid: false, error };
    }
  }

  // 安全检查：检测可能的注入攻击
  const dangerousPatterns = [
    /[\r\n]/, // 换行符注入
    /javascript:/i, // JavaScript伪协议
    /<script/i, // Script标签
    /[\x00-\x1f\x7f]/, // 控制字符
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cookie)) {
      const error = "Cookie包含可疑字符，可能存在安全风险";
      console.log(`⚠️ Cookie安全检查失败: ${error}`);
      return { valid: false, error };
    }
  }

  console.log(`✅ Cookie验证通过: 包含所有必需字段`);
  return {
    valid: true,
    cookie: cookie.trim(),
    message: "Cookie验证通过",
  };
}

/**
 * 解析Cookie为对象格式（用于调试和分析）
 * 遵循SRP原则：专门负责Cookie解析
 * @param {string} cookie Cookie字符串
 * @returns {Object} Cookie对象
 */
function parseCookie(cookie) {
  const cookieObj = {};
  if (!cookie) return cookieObj;

  try {
    const pairs = cookie.split(";").map((pair) => pair.trim());
    for (const pair of pairs) {
      if (pair.includes("=")) {
        const [key, ...valueParts] = pair.split("=");
        const value = valueParts.join("="); // 处理value中包含=的情况
        cookieObj[key.trim()] = value.trim();
      }
    }
  } catch (error) {
    console.log(`❌ Cookie解析失败: ${error.message}`);
  }

  return cookieObj;
}

/**
 * 格式化Cookie用于请求头
 * 遵循SRP原则：专门负责Cookie格式化
 * @param {string} cookie Cookie字符串
 * @returns {string} 格式化的Cookie
 */
function formatCookieHeader(cookie) {
  const validation = validateCookie(cookie);
  if (!validation.valid) {
    throw new Error(`Cookie无效: ${validation.error}`);
  }

  // 清理和格式化Cookie
  const cleanCookie = cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .join("; ");

  return cleanCookie;
}

/**
 * 执行签到操作
 * 遵循SRP原则：专门处理签到请求逻辑
 * @param {string} cookie Cookie字符串
 * @returns {Object} 签到结果
 */
async function performSignIn(cookie) {
  // {{CHENGQI:
  // Action: Modified
  // Timestamp: 2024-12-19 17:42:00 +08:00
  // Reason: Per P3-LD-003 使用新的formatCookieHeader函数确保Cookie格式正确
  // Principle_Applied: SRP (使用专门的Cookie格式化函数), DRY (复用验证逻辑)
  // Optimization: 增强Cookie处理的安全性和可靠性
  // }}

  let formattedCookie;
  try {
    formattedCookie = formatCookieHeader(cookie);
  } catch (error) {
    console.log(`❌ Cookie格式化失败: ${error.message}`);
    return { success: false, message: `Cookie格式化失败: ${error.message}` };
  }

  const requestOptions = {
    url: CONFIG.signUrl,
    method: "POST",
    headers: {
      accept: "text/plain, */*; q=0.01",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      "content-length": "0",
      cookie: formattedCookie,
      dnt: "1",
      origin: "https://kuafuzys.com",
      priority: "u=1, i",
      referer: "https://kuafuzys.com/",
      "sec-ch-ua": '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      "x-requested-with": "XMLHttpRequest",
    },
    timeout: CONFIG.timeout,
  };

  try {
    console.log(`📡 发送签到请求...`);

    const response = await httpRequest(requestOptions);
    return parseSignInResponse(response);
  } catch (error) {
    console.log(`🔄 请求失败，准备重试: ${error.message}`);
    return await retrySignIn(requestOptions);
  }
}

/**
 * HTTP请求函数
 * 遵循DRY原则：提供通用的HTTP请求功能
 * @param {Object} options 请求选项
 * @returns {Promise} 响应结果
 */
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("请求超时"));
    }, options.timeout || CONFIG.timeout);

    if ($.isNode()) {
      // Node.js环境使用内置模块
      const https = require("https");
      const url = require("url");

      const urlParts = url.parse(options.url);
      const postData = options.body || "";

      const reqOptions = {
        hostname: urlParts.hostname,
        port: urlParts.port || 443,
        path: urlParts.path,
        method: options.method || "GET",
        headers: {
          "Content-Length": Buffer.byteLength(postData),
          ...options.headers,
        },
      };

      const req = https.request(reqOptions, (res) => {
        clearTimeout(timeout);

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    } else {
      // 其他环境使用对应的HTTP客户端
      const requestFunc = options.method === "POST" ? $.post.bind($) : $.get.bind($);

      requestFunc(options, (error, response, body) => {
        clearTimeout(timeout);

        if (error) {
          reject(error);
        } else {
          resolve({
            statusCode: response.statusCode || response.status,
            headers: response.headers,
            body: body,
          });
        }
      });
    }
  });
}

/**
 * 解析签到响应
 * 遵循SRP原则：专门处理响应解析逻辑
 * @param {Object} response HTTP响应
 * @returns {Object} 解析结果
 */
function parseSignInResponse(response) {
  console.log(`📥 收到响应，状态码: ${response.statusCode}`);

  if (response.statusCode !== 200) {
    return {
      success: false,
      message: `HTTP状态异常: ${response.statusCode}`,
    };
  }

  const body = response.body;
  console.log(`📄 响应内容: ${body.substring(0, 200)}${body.length > 200 ? "..." : ""}`);

  // 根据响应内容判断签到结果
  // 需要根据实际响应格式调整解析逻辑
  if (body.includes("签到成功") || body.includes("success")) {
    return {
      success: true,
      message: "签到成功",
    };
  } else if (body.includes("已签到") || body.includes("已经签到")) {
    return {
      success: true,
      message: "今日已签到",
    };
  } else if (body.includes("登录") || body.includes("login")) {
    return {
      success: false,
      message: "Cookie已失效，请重新获取",
    };
  } else {
    return {
      success: false,
      message: "签到失败，请检查网站状态",
    };
  }
}

/**
 * 重试签到操作
 * 遵循可靠性原则：提供重试机制
 * @param {Object} options 请求选项
 * @returns {Object} 重试结果
 */
async function retrySignIn(options) {
  for (let i = 1; i <= CONFIG.retryTimes; i++) {
    try {
      console.log(`🔄 第 ${i} 次重试...`);
      await wait(CONFIG.retryDelay);

      const response = await httpRequest(options);
      return parseSignInResponse(response);
    } catch (error) {
      console.log(`❌ 第 ${i} 次重试失败: ${error.message}`);

      if (i === CONFIG.retryTimes) {
        return {
          success: false,
          message: `重试 ${CONFIG.retryTimes} 次后仍然失败: ${error.message}`,
        };
      }
    }
  }
}

/**
 * 延时函数
 * 遵循DRY原则：复用项目中常见的延时逻辑
 * @param {number} ms 延时毫秒数
 * @returns {Promise}
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 格式化Cookie字符串，隐藏敏感信息用于日志输出
 * 遵循安全编码原则：避免敏感信息泄露
 * @param {string} cookie 原始Cookie
 * @returns {string} 脱敏后的Cookie
 */
function maskCookie(cookie) {
  if (!cookie) return "";

  // 提取bbs_sid进行部分显示
  const sidMatch = cookie.match(/bbs_sid=([^;]+)/);
  if (sidMatch) {
    const sid = sidMatch[1];
    return `bbs_sid=${sid.substring(0, 6)}****${sid.substring(sid.length - 4)}...`;
  }

  return "Cookie****";
}

// 执行主函数
if (require.main === module) {
  main().catch(console.error);
}

function Env(t, e) {
  "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0);

  class s {
    constructor(t) {
      this.env = t;
    }

    send(t, e = "GET") {
      t =
        "string" == typeof t
          ? {
              url: t,
            }
          : t;
      let s = this.get;
      "POST" === e && (s = this.post);
      return new Promise((e, i) => {
        s.call(this, t, (t, s, r) => {
          t ? i(t) : e(s);
        });
      });
    }

    get(t) {
      return this.send.call(this.env, t);
    }

    post(t) {
      return this.send.call(this.env, t, "POST");
    }
  }

  return new (class {
    constructor(t, e) {
      this.name = t;
      this.http = new s(this);
      this.data = null;
      this.dataFile = "box.dat";
      this.logs = [];
      this.isMute = !1;
      this.isNeedRewrite = !1;
      this.logSeparator = "\n";
      this.startTime = new Date().getTime();
      Object.assign(this, e);
      this.log("", `🔔${this.name}, 开始!`);
    }

    isNode() {
      return "undefined" != typeof module && !!module.exports;
    }

    isQuanX() {
      return "undefined" != typeof $task;
    }

    isSurge() {
      return "undefined" != typeof $httpClient && "undefined" == typeof $loon;
    }

    isLoon() {
      return "undefined" != typeof $loon;
    }

    toObj(t, e = null) {
      try {
        return JSON.parse(t);
      } catch {
        return e;
      }
    }

    toStr(t, e = null) {
      try {
        return JSON.stringify(t);
      } catch {
        return e;
      }
    }

    getjson(t, e) {
      let s = e;
      const i = this.getdata(t);

      if (i) {
        try {
          s = JSON.parse(this.getdata(t));
        } catch {}
      }

      return s;
    }

    setjson(t, e) {
      try {
        return this.setdata(JSON.stringify(t), e);
      } catch {
        return !1;
      }
    }

    getScript(t) {
      return new Promise((e) => {
        this.get(
          {
            url: t,
          },
          (t, s, i) => e(i)
        );
      });
    }

    runScript(t, e) {
      return new Promise((s) => {
        let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
        i = i ? i.replace(/\n/g, "").trim() : i;
        let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
        r = r ? 1 * r : 20;
        r = e && e.timeout ? e.timeout : r;
        const [o, h] = i.split("@"),
          n = {
            url: `http://${h}/v1/scripting/evaluate`,
            body: {
              script_text: t,
              mock_type: "cron",
              timeout: r,
            },
            headers: {
              "X-Key": o,
              Accept: "*/*",
            },
          };
        this.post(n, (t, e, i) => s(i));
      }).catch((t) => this.logErr(t));
    }

    loaddata() {
      if (!this.isNode()) {
        return {};
      }

      {
        this.fs = this.fs ? this.fs : require("fs");
        this.path = this.path ? this.path : require("path");
        const t = this.path.resolve(this.dataFile),
          e = this.path.resolve(process.cwd(), this.dataFile),
          s = this.fs.existsSync(t),
          i = !s && this.fs.existsSync(e);

        if (!s && !i) {
          return {};
        }

        {
          const i = s ? t : e;

          try {
            return JSON.parse(this.fs.readFileSync(i));
          } catch (t) {
            return {};
          }
        }
      }
    }

    writedata() {
      if (this.isNode()) {
        this.fs = this.fs ? this.fs : require("fs");
        this.path = this.path ? this.path : require("path");
        const t = this.path.resolve(this.dataFile),
          e = this.path.resolve(process.cwd(), this.dataFile),
          s = this.fs.existsSync(t),
          i = !s && this.fs.existsSync(e),
          r = JSON.stringify(this.data);
        s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r);
      }
    }

    lodash_get(t, e, s) {
      const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
      let r = t;

      for (const t of i)
        if (((r = Object(r)[t]), void 0 === r)) {
          return s;
        }

      return r;
    }

    lodash_set(t, e, s) {
      return Object(t) !== t
        ? t
        : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []),
          (e
            .slice(0, -1)
            .reduce(
              (t, s, i) => (Object(t[s]) === t[s] ? t[s] : (t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {})),
              t
            )[e[e.length - 1]] = s),
          t);
    }

    getdata(t) {
      let e = this.getval(t);

      if (/^@/.test(t)) {
        const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t),
          r = s ? this.getval(s) : "";

        if (r) {
          try {
            const t = JSON.parse(r);
            e = t ? this.lodash_get(t, i, "") : e;
          } catch (t) {
            e = "";
          }
        }
      }

      return e;
    }

    setdata(t, e) {
      let s = !1;

      if (/^@/.test(e)) {
        const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e),
          o = this.getval(i),
          h = i ? ("null" === o ? null : o || "{}") : "{}";

        try {
          const e = JSON.parse(h);
          this.lodash_set(e, r, t);
          s = this.setval(JSON.stringify(e), i);
        } catch (e) {
          const o = {};
          this.lodash_set(o, r, t);
          s = this.setval(JSON.stringify(o), i);
        }
      } else {
        s = this.setval(t, e);
      }

      return s;
    }

    getval(t) {
      return this.isSurge() || this.isLoon()
        ? $persistentStore.read(t)
        : this.isQuanX()
          ? $prefs.valueForKey(t)
          : this.isNode()
            ? ((this.data = this.loaddata()), this.data[t])
            : (this.data && this.data[t]) || null;
    }

    setval(t, e) {
      return this.isSurge() || this.isLoon()
        ? $persistentStore.write(t, e)
        : this.isQuanX()
          ? $prefs.setValueForKey(t, e)
          : this.isNode()
            ? ((this.data = this.loaddata()), (this.data[e] = t), this.writedata(), !0)
            : (this.data && this.data[e]) || null;
    }

    initGotEnv(t) {
      this.got = this.got ? this.got : require("got");
      this.cktough = this.cktough ? this.cktough : require("tough-cookie");
      this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar();
      t &&
        ((t.headers = t.headers ? t.headers : {}),
        void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar));
    }

    get(t, e = () => {}) {
      t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]);
      this.isSurge() || this.isLoon()
        ? (this.isSurge() &&
            this.isNeedRewrite &&
            ((t.headers = t.headers || {}),
            Object.assign(t.headers, {
              "X-Surge-Skip-Scripting": !1,
            })),
          $httpClient.get(t, (t, s, i) => {
            !t && s && ((s.body = i), (s.statusCode = s.status));
            e(t, s, i);
          }))
        : this.isQuanX()
          ? (this.isNeedRewrite &&
              ((t.opts = t.opts || {}),
              Object.assign(t.opts, {
                hints: !1,
              })),
            $task.fetch(t).then(
              (t) => {
                const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                e(
                  null,
                  {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o,
                  },
                  o
                );
              },
              (t) => e(t)
            ))
          : this.isNode() &&
            (this.initGotEnv(t),
            this.got(t)
              .on("redirect", (t, e) => {
                try {
                  if (t.headers["set-cookie"]) {
                    const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                    s && this.ckjar.setCookieSync(s, null);
                    e.cookieJar = this.ckjar;
                  }
                } catch (t) {
                  this.logErr(t);
                }
              })
              .then(
                (t) => {
                  const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                  e(
                    null,
                    {
                      status: s,
                      statusCode: i,
                      headers: r,
                      body: o,
                    },
                    o
                  );
                },
                (t) => {
                  const { message: s, response: i } = t;
                  e(s, i, i && i.body);
                }
              ));
    }

    post(t, e = () => {}) {
      if (
        (t.body &&
          t.headers &&
          !t.headers["Content-Type"] &&
          (t.headers["Content-Type"] = "application/x-www-form-urlencoded"),
        t.headers && delete t.headers["Content-Length"],
        this.isSurge() || this.isLoon())
      ) {
        this.isSurge() &&
          this.isNeedRewrite &&
          ((t.headers = t.headers || {}),
          Object.assign(t.headers, {
            "X-Surge-Skip-Scripting": !1,
          }));
        $httpClient.post(t, (t, s, i) => {
          !t && s && ((s.body = i), (s.statusCode = s.status));
          e(t, s, i);
        });
      } else {
        if (this.isQuanX()) {
          t.method = "POST";
          this.isNeedRewrite &&
            ((t.opts = t.opts || {}),
            Object.assign(t.opts, {
              hints: !1,
            }));
          $task.fetch(t).then(
            (t) => {
              const { statusCode: s, statusCode: i, headers: r, body: o } = t;
              e(
                null,
                {
                  status: s,
                  statusCode: i,
                  headers: r,
                  body: o,
                },
                o
              );
            },
            (t) => e(t)
          );
        } else {
          if (this.isNode()) {
            this.initGotEnv(t);
            const { url: s, ...i } = t;
            this.got.post(s, i).then(
              (t) => {
                const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                e(
                  null,
                  {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o,
                  },
                  o
                );
              },
              (t) => {
                const { message: s, response: i } = t;
                e(s, i, i && i.body);
              }
            );
          }
        }
      }
    }

    time(t, e = null) {
      const s = e ? new Date(e) : new Date();
      let i = {
        "M+": s.getMonth() + 1,
        "d+": s.getDate(),
        "H+": s.getHours(),
        "m+": s.getMinutes(),
        "s+": s.getSeconds(),
        "q+": Math.floor((s.getMonth() + 3) / 3),
        S: s.getMilliseconds(),
      };
      /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length)));

      for (let e in i)
        new RegExp("(" + e + ")").test(t) &&
          (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)));

      return t;
    }

    msg(e = t, s = "", i = "", r) {
      const o = (t) => {
        if (!t) {
          return t;
        }

        if ("string" == typeof t) {
          return this.isLoon()
            ? t
            : this.isQuanX()
              ? {
                  "open-url": t,
                }
              : this.isSurge()
                ? {
                    url: t,
                  }
                : void 0;
        }

        if ("object" == typeof t) {
          if (this.isLoon()) {
            let e = t.openUrl || t.url || t["open-url"],
              s = t.mediaUrl || t["media-url"];
            return {
              openUrl: e,
              mediaUrl: s,
            };
          }

          if (this.isQuanX()) {
            let e = t["open-url"] || t.url || t.openUrl,
              s = t["media-url"] || t.mediaUrl;
            return {
              "open-url": e,
              "media-url": s,
            };
          }

          if (this.isSurge()) {
            let e = t.url || t.openUrl || t["open-url"];
            return {
              url: e,
            };
          }
        }
      };

      if (
        (this.isMute ||
          (this.isSurge() || this.isLoon()
            ? $notification.post(e, s, i, o(r))
            : this.isQuanX() && $notify(e, s, i, o(r))),
        !this.isMuteLog)
      ) {
        let t = ["", "==============📣系统通知📣=============="];
        t.push(e);
        s && t.push(s);
        i && t.push(i);
        console.log(t.join("\n"));
        this.logs = this.logs.concat(t);
      }
    }

    log(...t) {
      t.length > 0 && (this.logs = [...this.logs, ...t]);
      console.log(t.join(this.logSeparator));
    }

    logErr(t, e) {
      const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
      s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t);
    }

    wait(t) {
      return new Promise((e) => setTimeout(e, t));
    }

    done(t = {}) {
      const e = new Date().getTime(),
        s = (e - this.startTime) / 1000;
      this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`);
      this.log();
      (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t);
    }
  })(t, e);
}

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

/**
 * 环境适配函数
 * 遵循Open/Closed原则：支持多种运行环境
 * 复用项目中现有的Env实现模式
 */
function Env(name, opts) {
  class Environment {
    constructor(name, opts) {
      this.name = name;
      this.logs = [];
      this.startTime = new Date().getTime();
      Object.assign(this, opts);
      this.log("", `🔔 ${this.name}, 开始!`);
    }

    // 判断是否为Node.js环境
    isNode() {
      return typeof require !== "undefined" && Boolean(module && module.exports);
    }

    // 判断是否为QuantumultX环境
    isQuanX() {
      return typeof $task !== "undefined";
    }

    // 判断是否为Surge环境
    isSurge() {
      return typeof $httpClient !== "undefined" && typeof $loon === "undefined";
    }

    // 判断是否为Loon环境
    isLoon() {
      return typeof $loon !== "undefined";
    }

    // 获取数据
    getdata(key) {
      if (this.isSurge() || this.isLoon()) {
        return $persistentStore.read(key);
      } else if (this.isQuanX()) {
        return $prefs.valueForKey(key);
      } else if (this.isNode()) {
        return process.env[key] || "";
      }
      return "";
    }

    // 设置数据
    setdata(val, key) {
      if (this.isSurge() || this.isLoon()) {
        return $persistentStore.write(val, key);
      } else if (this.isQuanX()) {
        return $prefs.setValueForKey(val, key);
      } else if (this.isNode()) {
        process.env[key] = val;
        return true;
      }
      return false;
    }

    // 日志输出
    log(...args) {
      if (args.length > 0) {
        this.logs = [...this.logs, ...args];
      }
      console.log(args.join(" "));
    }

    // HTTP GET请求
    get(options, callback = () => {}) {
      if (this.isSurge() || this.isLoon()) {
        $httpClient.get(options, (error, response, data) => {
          if (!error && response) {
            response.body = data;
            response.statusCode = response.status;
          }
          callback(error, response, data);
        });
      } else if (this.isQuanX()) {
        $task.fetch(options).then(
          (response) => {
            const { statusCode, statusCode: status, headers, body } = response;
            callback(null, { status: statusCode, statusCode: status, headers, body }, body);
          },
          (error) => callback(error)
        );
      } else if (this.isNode()) {
        // Node.js环境在httpRequest函数中处理
        callback(new Error("Node.js环境请使用httpRequest函数"));
      }
    }

    // HTTP POST请求
    post(options, callback = () => {}) {
      if (options.body && options.headers && !options.headers["Content-Type"]) {
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      if (this.isSurge() || this.isLoon()) {
        $httpClient.post(options, (error, response, data) => {
          if (!error && response) {
            response.body = data;
            response.statusCode = response.status;
          }
          callback(error, response, data);
        });
      } else if (this.isQuanX()) {
        options.method = "POST";
        $task.fetch(options).then(
          (response) => {
            const { statusCode, statusCode: status, headers, body } = response;
            callback(null, { status: statusCode, statusCode: status, headers, body }, body);
          },
          (error) => callback(error)
        );
      } else if (this.isNode()) {
        // Node.js环境在httpRequest函数中处理
        callback(new Error("Node.js环境请使用httpRequest函数"));
      }
    }

    // 脚本结束
    done(val = {}) {
      const endTime = new Date().getTime();
      const costTime = (endTime - this.startTime) / 1000;
      this.log("", `🔔 ${this.name}, 结束! 🕛 ${costTime} 秒`);
      this.log();

      if (this.isSurge() || this.isQuanX() || this.isLoon()) {
        $done(val);
      }
    }
  }

  return new Environment(name, opts);
}

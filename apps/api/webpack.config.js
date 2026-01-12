const path = require('path');

module.exports = (options, webpack) => {
  // 确保 reflect-metadata 在所有其他模块之前加载
  const entry = options.entry;
  
  // 如果 entry 是字符串，转换为数组
  if (typeof entry === 'string') {
    options.entry = ['reflect-metadata', entry];
  } else if (Array.isArray(entry)) {
    options.entry = ['reflect-metadata', ...entry];
  } else if (typeof entry === 'object') {
    // 对于对象形式的 entry
    for (const key in entry) {
      if (typeof entry[key] === 'string') {
        entry[key] = ['reflect-metadata', entry[key]];
      } else if (Array.isArray(entry[key])) {
        entry[key] = ['reflect-metadata', ...entry[key]];
      }
    }
  }

  return options;
};

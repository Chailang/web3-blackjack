# 环境变量设置

## 开发环境

在项目根目录创建 `.env.local` 文件（如果不存在）：

```bash
# JWT密钥 - 用于签名和验证JWT token
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# 其他环境变量可以在这里添加
# DATABASE_URL=your-database-url
# API_KEY=your-api-key
```

## 生产环境

在生产环境中，请确保设置以下环境变量：

1. **JWT_SECRET**: 一个强随机的字符串，用于JWT签名
2. **其他数据库或API密钥**（如果需要）

## 注意事项

- `.env.local` 文件已被 `.gitignore` 忽略，不会被提交到版本控制
- 开发环境如果没有设置 `JWT_SECRET`，会使用默认密钥（仅用于开发）
- 生产环境必须设置 `JWT_SECRET` 环境变量

## 生成安全的JWT密钥

可以使用以下命令生成安全的随机字符串作为JWT密钥：

```bash
# 使用Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 或使用OpenSSL
openssl rand -hex 64
``` 
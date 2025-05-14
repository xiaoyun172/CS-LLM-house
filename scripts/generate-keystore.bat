@echo off
setlocal EnableDelayedExpansion

:: 获取用户输入
echo ===== AetherLink Android 签名密钥生成工具 =====
echo 此脚本将帮助您生成Android应用签名密钥并准备GitHub Actions所需的Secrets
echo.

set /p PACKAGE_NAME=请输入应用包名 (例如: com.llmhouse): 
set /p KEY_ALIAS=请输入密钥别名 (例如: aetherlink): 
set /p KEY_PASSWORD=请输入密钥密码: 
set /p KEYSTORE_PASSWORD=请输入Keystore密码: 
set /p VALIDITY=请输入Keystore有效期 (年数, 默认: 25): 

if "!VALIDITY!"=="" set VALIDITY=25

:: 创建scripts/keystore目录（如果不存在）
if not exist scripts\keystore mkdir scripts\keystore

:: 生成keystore文件
echo.
echo 正在生成keystore文件...
keytool -genkey -v ^
  -keystore scripts/keystore/aetherlink.keystore ^
  -alias !KEY_ALIAS! ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity !VALIDITY!00 ^
  -storepass !KEYSTORE_PASSWORD! ^
  -keypass !KEY_PASSWORD! ^
  -dname "CN=AetherLink, OU=Development, O=LLMHouse, L=Unknown, ST=Unknown, C=CN"

:: 检查是否生成成功
if %ERRORLEVEL% neq 0 (
  echo 生成keystore失败，请检查输入信息并重试
  exit /b 1
)

:: 将keystore转换为base64 (需要安装certutil)
echo.
echo 正在将keystore转换为Base64编码...
certutil -encodehex -f scripts\keystore\aetherlink.keystore scripts\keystore\keystore_hex.txt 0x40000001
type scripts\keystore\keystore_hex.txt > scripts\keystore\keystore.txt
del scripts\keystore\keystore_hex.txt

:: 显示信息
echo.
echo ===== GitHub Actions Secrets 配置信息 =====
echo 请将以下信息添加到GitHub仓库的Secrets中:
echo.
echo KEYSTORE_BASE64: 请查看 scripts\keystore\keystore.txt 文件内容
echo KEYSTORE_PASSWORD: !KEYSTORE_PASSWORD!
echo KEY_ALIAS: !KEY_ALIAS!
echo KEY_PASSWORD: !KEY_PASSWORD!
echo.
echo 签名密钥生成完成！文件保存在 scripts\keystore\aetherlink.keystore
echo 注意: 请妥善保管您的密钥文件和密码，一旦丢失将无法更新已发布的应用

pause 
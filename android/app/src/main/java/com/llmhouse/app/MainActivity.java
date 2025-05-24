package com.llmhouse.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.llmhouse.app.webview.SmartWebViewManager;
import com.llmhouse.app.webview.WebViewDetector;
import com.llmhouse.app.webview.WebViewUpgradeDialog;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 在Capacitor 4+中，必须在super.onCreate之前注册插件
        registerPlugin(ModernWebViewPlugin.class);

        super.onCreate(savedInstanceState);

        // 添加明显的启动日志
        Log.i(TAG, "=== MainActivity onCreate 开始 ===");
        System.out.println("=== MainActivity onCreate 开始 ===");

        // 初始化现代WebView管理
        initializeModernWebView();

        // 针对Android 15及以上版本处理状态栏重叠问题
        if (Build.VERSION.SDK_INT >= 35) {
            // 设置状态栏为非透明
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

            // 设置状态栏为可绘制
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

            // 确保状态栏文字为亮色（白色）
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decorView = getWindow().getDecorView();
                int flags = decorView.getSystemUiVisibility();
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR; // 移除亮色状态栏标志，使状态栏文字为白色
                decorView.setSystemUiVisibility(flags);
            }

            // 添加窗口内容扩展到状态栏
            View decorView = getWindow().getDecorView();
            decorView.setOnApplyWindowInsetsListener((v, insets) -> {
                // 确保WebView不会被状态栏覆盖
                View webView = findViewById(android.R.id.content);
                if (webView != null) {
                    ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
                        int statusBarHeight = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
                        view.setPadding(0, statusBarHeight, 0, 0);
                        return WindowInsetsCompat.CONSUMED;
                    });
                }
                return insets;
            });
        }
    }

    /**
     * 初始化现代WebView管理系统
     */
    private void initializeModernWebView() {
        try {
            Log.d(TAG, "🚀 开始初始化现代WebView管理系统");

            // 获取WebView信息
            WebViewDetector.WebViewInfo webViewInfo = WebViewDetector.getWebViewInfo(this);
            SmartWebViewManager.WebViewStrategy strategy = SmartWebViewManager.getBestStrategy(this);

            Log.d(TAG, String.format("📱 WebView信息: 版本=%d, 包名=%s, 质量=%s",
                webViewInfo.version, webViewInfo.packageName, webViewInfo.getQualityLevel()));
            Log.d(TAG, "🎯 选择策略: " + strategy);

            // 替换Capacitor的WebView为优化版本
            replaceCapacitorWebView();

            // 检查是否需要显示升级对话框
            if (webViewInfo.needsUpgrade()) {
                Log.d(TAG, "⚠️ WebView版本较低，将在适当时机提示升级");
                // 延迟显示升级对话框，避免影响应用启动
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    WebViewUpgradeDialog.showUpgradeDialogIfNeeded(this);
                }, 3000); // 3秒后检查
            } else {
                Log.d(TAG, "✅ WebView版本良好，无需升级");
            }

            Log.d(TAG, "🎉 现代WebView管理系统初始化完成");

        } catch (Exception e) {
            Log.e(TAG, "❌ 初始化现代WebView管理系统时发生错误: " + e.getMessage(), e);
        }
    }

    /**
     * 替换Capacitor的WebView为优化版本
     */
    private void replaceCapacitorWebView() {
        try {
            Log.d(TAG, "🔄 开始替换Capacitor WebView");

            // 获取Capacitor的Bridge
            if (getBridge() != null && getBridge().getWebView() != null) {
                // 创建优化的WebView
                android.webkit.WebView optimizedWebView = SmartWebViewManager.createOptimizedWebView(this);

                Log.d(TAG, "✅ 成功创建优化的WebView");
                Log.d(TAG, "📊 WebView UserAgent: " + optimizedWebView.getSettings().getUserAgentString());

                // 注意：这里我们不直接替换WebView，而是确保新创建的WebView使用了我们的优化配置
                // Capacitor的WebView替换需要更深层的集成

            } else {
                Log.w(TAG, "⚠️ 无法获取Capacitor Bridge或WebView");
            }

        } catch (Exception e) {
            Log.e(TAG, "❌ 替换WebView时发生错误: " + e.getMessage(), e);
        }
    }
}

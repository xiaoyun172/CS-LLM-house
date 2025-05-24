package com.llmhouse.app.webview;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * WebView版本检测和兼容性分析工具
 */
public class WebViewDetector {
    private static final String TAG = "WebViewDetector";
    
    // WebView版本阈值
    public static final int MIN_RECOMMENDED_VERSION = 80;
    public static final int OPTIMAL_VERSION = 100;
    public static final int LATEST_VERSION = 137;

    /**
     * WebView信息数据类
     */
    public static class WebViewInfo {
        public final int version;
        public final String versionName;
        public final String packageName;
        public final boolean isGoogleChrome;
        public final boolean isUpdatable;
        public final boolean supportsModernFeatures;
        public final String userAgent;
        
        public WebViewInfo(int version, String versionName, String packageName, 
                          boolean isGoogleChrome, boolean isUpdatable, 
                          boolean supportsModernFeatures, String userAgent) {
            this.version = version;
            this.versionName = versionName;
            this.packageName = packageName;
            this.isGoogleChrome = isGoogleChrome;
            this.isUpdatable = isUpdatable;
            this.supportsModernFeatures = supportsModernFeatures;
            this.userAgent = userAgent;
        }
        
        public String getQualityLevel() {
            if (version >= OPTIMAL_VERSION) return "优秀";
            if (version >= MIN_RECOMMENDED_VERSION) return "良好";
            if (version >= 60) return "一般";
            return "需要升级";
        }
        
        public boolean needsUpgrade() {
            return version < MIN_RECOMMENDED_VERSION;
        }
    }

    /**
     * 获取当前WebView的详细信息
     */
    public static WebViewInfo getWebViewInfo(Context context) {
        try {
            // 获取WebView版本信息
            int version = extractVersionFromUserAgent(context);
            String versionName = getWebViewVersionName(context);
            String packageName = getWebViewPackageName(context);
            boolean isGoogleChrome = isUsingChromeWebView(packageName);
            boolean isUpdatable = canUpdateWebView(context);
            boolean supportsModernFeatures = checkModernFeatureSupport();
            String userAgent = getUserAgent(context);
            
            Log.d(TAG, String.format("WebView检测结果: 版本=%d, 包名=%s, Chrome=%b", 
                version, packageName, isGoogleChrome));
            
            return new WebViewInfo(version, versionName, packageName, 
                isGoogleChrome, isUpdatable, supportsModernFeatures, userAgent);
                
        } catch (Exception e) {
            Log.e(TAG, "获取WebView信息时发生错误: " + e.getMessage(), e);
            // 返回默认信息
            return new WebViewInfo(0, "未知", "未知", false, false, false, "未知");
        }
    }

    /**
     * 从UserAgent中提取Chrome版本号
     */
    private static int extractVersionFromUserAgent(Context context) {
        try {
            String userAgent = getUserAgent(context);
            Pattern pattern = Pattern.compile("Chrome/(\\d+)");
            Matcher matcher = pattern.matcher(userAgent);
            
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }
        } catch (Exception e) {
            Log.w(TAG, "无法从UserAgent提取版本: " + e.getMessage());
        }
        return 0;
    }

    /**
     * 获取WebView的UserAgent
     */
    private static String getUserAgent(Context context) {
        try {
            WebView webView = new WebView(context);
            String userAgent = webView.getSettings().getUserAgentString();
            webView.destroy();
            return userAgent;
        } catch (Exception e) {
            Log.w(TAG, "无法获取UserAgent: " + e.getMessage());
            return "未知";
        }
    }

    /**
     * 获取WebView版本名称
     */
    private static String getWebViewVersionName(Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PackageInfo packageInfo = WebView.getCurrentWebViewPackage();
                if (packageInfo != null) {
                    return packageInfo.versionName;
                }
            }
            
            // 降级方案：通过AndroidX WebKit获取
            if (WebViewFeature.isFeatureSupported(WebViewFeature.GET_WEB_VIEW_CLIENT)) {
                return WebViewCompat.getCurrentWebViewPackage(context).versionName;
            }
        } catch (Exception e) {
            Log.w(TAG, "无法获取WebView版本名称: " + e.getMessage());
        }
        return "未知";
    }

    /**
     * 获取WebView包名
     */
    private static String getWebViewPackageName(Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PackageInfo packageInfo = WebView.getCurrentWebViewPackage();
                if (packageInfo != null) {
                    return packageInfo.packageName;
                }
            }
            
            // 降级方案
            if (WebViewFeature.isFeatureSupported(WebViewFeature.GET_WEB_VIEW_CLIENT)) {
                return WebViewCompat.getCurrentWebViewPackage(context).packageName;
            }
        } catch (Exception e) {
            Log.w(TAG, "无法获取WebView包名: " + e.getMessage());
        }
        return "未知";
    }

    /**
     * 检查是否使用Chrome WebView
     */
    private static boolean isUsingChromeWebView(String packageName) {
        return packageName != null && (
            packageName.contains("chrome") || 
            packageName.contains("google")
        );
    }

    /**
     * 检查WebView是否可以更新
     */
    private static boolean canUpdateWebView(Context context) {
        try {
            String packageName = getWebViewPackageName(context);
            
            // Chrome WebView通常可以通过Google Play更新
            if (isUsingChromeWebView(packageName)) {
                return true;
            }
            
            // Android System WebView在某些版本上可以更新
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                return true;
            }
            
            return false;
        } catch (Exception e) {
            Log.w(TAG, "检查WebView更新能力时发生错误: " + e.getMessage());
            return false;
        }
    }

    /**
     * 检查现代WebView特性支持
     */
    private static boolean checkModernFeatureSupport() {
        try {
            // 检查一些关键的现代WebView特性
            return WebViewFeature.isFeatureSupported(WebViewFeature.VISUAL_STATE_CALLBACK) &&
                   WebViewFeature.isFeatureSupported(WebViewFeature.OFF_SCREEN_PRERASTER) &&
                   WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_ENABLE);
        } catch (Exception e) {
            Log.w(TAG, "检查现代特性支持时发生错误: " + e.getMessage());
            return false;
        }
    }

    /**
     * 获取推荐的升级建议
     */
    public static String getUpgradeRecommendation(WebViewInfo info) {
        if (info.version >= OPTIMAL_VERSION) {
            return "您的WebView版本很棒！无需升级。";
        } else if (info.version >= MIN_RECOMMENDED_VERSION) {
            return "您的WebView版本良好，建议升级到最新版本以获得更好的性能。";
        } else if (info.version >= 60) {
            return "建议升级WebView以获得更好的兼容性和安全性。";
        } else {
            return "强烈建议升级WebView，当前版本可能存在兼容性问题。";
        }
    }
}

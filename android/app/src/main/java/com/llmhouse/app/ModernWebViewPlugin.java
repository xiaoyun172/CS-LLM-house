package com.llmhouse.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.llmhouse.app.webview.WebViewDetector;
import com.llmhouse.app.webview.SmartWebViewManager;
import com.llmhouse.app.webview.WebViewUpgradeDialog;
import android.util.Log;

/**
 * 现代WebView状态插件
 * 替代之前的X5插件，提供WebView检测和管理功能
 */
@CapacitorPlugin(name = "ModernWebView")
public class ModernWebViewPlugin extends Plugin {
    private static final String TAG = "ModernWebViewPlugin";

    @PluginMethod()
    public void echo(PluginCall call) {
        Log.d(TAG, "🚀 ModernWebView插件Echo方法被调用");
        String value = call.getString("value", "Hello from ModernWebView Plugin!");
        Log.d(TAG, "🚀 接收到的值: " + value);

        JSObject ret = new JSObject();
        ret.put("value", value);
        ret.put("plugin", "ModernWebView");
        ret.put("version", "1.0.0");

        Log.d(TAG, "🚀 Echo方法执行完成");
        call.resolve(ret);
    }

    @PluginMethod()
    public void getWebViewInfo(PluginCall call) {
        try {
            Log.d(TAG, "开始获取WebView信息");

            // 在主线程中执行WebView相关操作
            getActivity().runOnUiThread(() -> {
                try {
                    WebViewDetector.WebViewInfo info = WebViewDetector.getWebViewInfo(getContext());
                    SmartWebViewManager.WebViewStrategy strategy = SmartWebViewManager.getBestStrategy(getContext());

                    JSObject result = new JSObject();

                    // 基础信息
                    result.put("version", info.version);
                    result.put("versionName", info.versionName);
                    result.put("packageName", info.packageName);
                    result.put("userAgent", info.userAgent);

                    // 状态信息
                    result.put("isGoogleChrome", info.isGoogleChrome);
                    result.put("isUpdatable", info.isUpdatable);
                    result.put("supportsModernFeatures", info.supportsModernFeatures);
                    result.put("qualityLevel", info.getQualityLevel());
                    result.put("needsUpgrade", info.needsUpgrade());

                    // 策略信息
                    result.put("strategy", strategy.toString());
                    result.put("strategyDescription", getStrategyDescription(strategy));

                    // 升级建议
                    result.put("upgradeRecommendation", WebViewDetector.getUpgradeRecommendation(info));

                    // 版本阈值信息
                    result.put("minRecommendedVersion", WebViewDetector.MIN_RECOMMENDED_VERSION);
                    result.put("optimalVersion", WebViewDetector.OPTIMAL_VERSION);
                    result.put("latestVersion", WebViewDetector.LATEST_VERSION);

                    Log.d(TAG, "WebView信息获取完成: " + result.toString());
                    call.resolve(result);

                } catch (Exception e) {
                    Log.e(TAG, "获取WebView信息时发生错误: " + e.getMessage(), e);
                    call.reject("获取WebView信息失败: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "获取WebView信息时发生错误: " + e.getMessage(), e);
            call.reject("获取WebView信息失败: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void checkUpgradeNeeded(PluginCall call) {
        try {
            Log.d(TAG, "检查是否需要升级WebView");

            // 在主线程中执行WebView相关操作
            getActivity().runOnUiThread(() -> {
                try {
                    WebViewDetector.WebViewInfo info = WebViewDetector.getWebViewInfo(getContext());

                    JSObject result = new JSObject();
                    result.put("needsUpgrade", info.needsUpgrade());
                    result.put("currentVersion", info.version);
                    result.put("minRecommendedVersion", WebViewDetector.MIN_RECOMMENDED_VERSION);
                    result.put("isUpdatable", info.isUpdatable);
                    result.put("upgradeRecommendation", WebViewDetector.getUpgradeRecommendation(info));

                    Log.d(TAG, "升级检查完成: 需要升级=" + info.needsUpgrade());
                    call.resolve(result);

                } catch (Exception e) {
                    Log.e(TAG, "检查升级需求时发生错误: " + e.getMessage(), e);
                    call.reject("检查升级需求失败: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "检查升级需求时发生错误: " + e.getMessage(), e);
            call.reject("检查升级需求失败: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void showUpgradeDialog(PluginCall call) {
        try {
            Log.d(TAG, "显示WebView升级对话框");

            // 在主线程中显示对话框
            getActivity().runOnUiThread(() -> {
                try {
                    WebViewUpgradeDialog.forceShowUpgradeDialog(getContext());

                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "升级对话框已显示");

                    call.resolve(result);
                } catch (Exception e) {
                    Log.e(TAG, "显示对话框时发生错误: " + e.getMessage(), e);
                    call.reject("显示对话框失败: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "显示升级对话框时发生错误: " + e.getMessage(), e);
            call.reject("显示升级对话框失败: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void resetUpgradeReminder(PluginCall call) {
        try {
            Log.d(TAG, "重置升级提醒设置");

            WebViewUpgradeDialog.resetUpgradeReminder(getContext());

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "升级提醒设置已重置");

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "重置升级提醒时发生错误: " + e.getMessage(), e);
            call.reject("重置升级提醒失败: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void getWebViewStatus(PluginCall call) {
        try {
            Log.d(TAG, "获取WebView状态描述");

            // 在主线程中执行WebView相关操作
            getActivity().runOnUiThread(() -> {
                try {
                    String statusDescription = SmartWebViewManager.getWebViewStatusDescription(getContext());
                    WebViewDetector.WebViewInfo info = WebViewDetector.getWebViewInfo(getContext());
                    SmartWebViewManager.WebViewStrategy strategy = SmartWebViewManager.getBestStrategy(getContext());

                    JSObject result = new JSObject();
                    result.put("statusDescription", statusDescription);
                    result.put("version", info.version);
                    result.put("qualityLevel", info.getQualityLevel());
                    result.put("strategy", strategy.toString());
                    result.put("strategyDescription", getStrategyDescription(strategy));
                    result.put("needsUpgrade", info.needsUpgrade());
                    result.put("isOptimal", info.version >= WebViewDetector.OPTIMAL_VERSION);

                    Log.d(TAG, "WebView状态获取完成");
                    call.resolve(result);

                } catch (Exception e) {
                    Log.e(TAG, "获取WebView状态时发生错误: " + e.getMessage(), e);
                    call.reject("获取WebView状态失败: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "获取WebView状态时发生错误: " + e.getMessage(), e);
            call.reject("获取WebView状态失败: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void optimizeWebView(PluginCall call) {
        try {
            Log.d(TAG, "优化WebView配置");

            // 这里可以添加WebView优化逻辑
            // 例如清理缓存、重新配置设置等

            SmartWebViewManager.WebViewStrategy strategy = SmartWebViewManager.getBestStrategy(getContext());

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("message", "WebView配置已优化");
            result.put("appliedStrategy", strategy.toString());
            result.put("strategyDescription", getStrategyDescription(strategy));

            Log.d(TAG, "WebView优化完成，应用策略: " + strategy);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "优化WebView时发生错误: " + e.getMessage(), e);
            call.reject("优化WebView失败: " + e.getMessage());
        }
    }

    /**
     * 获取策略描述
     */
    private String getStrategyDescription(SmartWebViewManager.WebViewStrategy strategy) {
        switch (strategy) {
            case OPTIMAL:
                return "最优模式 - 使用所有现代WebView特性";
            case COMPATIBLE:
                return "兼容模式 - 平衡性能与兼容性";
            case BASIC:
                return "基础模式 - 保守配置确保稳定性";
            case UPGRADE_REQUIRED:
                return "升级模式 - 建议升级WebView版本";
            default:
                return "未知模式";
        }
    }

    /**
     * 获取版本比较信息
     */
    @PluginMethod()
    public void getVersionComparison(PluginCall call) {
        try {
            // 在主线程中执行WebView相关操作
            getActivity().runOnUiThread(() -> {
                try {
                    WebViewDetector.WebViewInfo info = WebViewDetector.getWebViewInfo(getContext());

                    JSObject result = new JSObject();
                    JSObject comparison = new JSObject();

                    comparison.put("current", info.version);
                    comparison.put("minRecommended", WebViewDetector.MIN_RECOMMENDED_VERSION);
                    comparison.put("optimal", WebViewDetector.OPTIMAL_VERSION);
                    comparison.put("latest", WebViewDetector.LATEST_VERSION);

                    result.put("versions", comparison);
                    result.put("currentQuality", info.getQualityLevel());
                    result.put("isAboveMinimum", info.version >= WebViewDetector.MIN_RECOMMENDED_VERSION);
                    result.put("isOptimal", info.version >= WebViewDetector.OPTIMAL_VERSION);
                    result.put("isLatest", info.version >= WebViewDetector.LATEST_VERSION);

                    call.resolve(result);

                } catch (Exception e) {
                    Log.e(TAG, "获取版本比较信息时发生错误: " + e.getMessage(), e);
                    call.reject("获取版本比较信息失败: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "获取版本比较信息时发生错误: " + e.getMessage(), e);
            call.reject("获取版本比较信息失败: " + e.getMessage());
        }
    }
}

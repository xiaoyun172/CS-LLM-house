package com.llmhouse.app.webview;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;

/**
 * WebView升级对话框管理器
 */
public class WebViewUpgradeDialog {
    private static final String TAG = "WebViewUpgradeDialog";
    private static final String PREFS_NAME = "webview_upgrade_prefs";
    private static final String KEY_DONT_SHOW_AGAIN = "dont_show_upgrade_dialog";
    private static final String KEY_LAST_SHOWN = "last_shown_timestamp";
    private static final long SHOW_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7天

    /**
     * 显示升级对话框（如果需要）
     */
    public static void showUpgradeDialogIfNeeded(Context context) {
        try {
            WebViewDetector.WebViewInfo info = WebViewDetector.getWebViewInfo(context);
            
            // 检查是否需要显示升级对话框
            if (!shouldShowUpgradeDialog(context, info)) {
                return;
            }
            
            showUpgradeDialog(context, info);
            
        } catch (Exception e) {
            Log.e(TAG, "显示升级对话框时发生错误: " + e.getMessage(), e);
        }
    }

    /**
     * 检查是否应该显示升级对话框
     */
    private static boolean shouldShowUpgradeDialog(Context context, WebViewDetector.WebViewInfo info) {
        // WebView版本足够新，不需要升级
        if (info.version >= WebViewDetector.MIN_RECOMMENDED_VERSION) {
            return false;
        }
        
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        // 用户选择了不再显示
        if (prefs.getBoolean(KEY_DONT_SHOW_AGAIN, false)) {
            return false;
        }
        
        // 检查距离上次显示的时间间隔
        long lastShown = prefs.getLong(KEY_LAST_SHOWN, 0);
        long currentTime = System.currentTimeMillis();
        
        return (currentTime - lastShown) > SHOW_INTERVAL;
    }

    /**
     * 显示升级对话框
     */
    private static void showUpgradeDialog(Context context, WebViewDetector.WebViewInfo info) {
        String title = "建议升级浏览器内核";
        String message = buildUpgradeMessage(info);
        
        new AlertDialog.Builder(context)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("立即升级", (dialog, which) -> {
                openWebViewUpgradePage(context, info);
                recordDialogShown(context);
            })
            .setNegativeButton("稍后提醒", (dialog, which) -> {
                recordDialogShown(context);
                dialog.dismiss();
            })
            .setNeutralButton("不再提醒", (dialog, which) -> {
                setDontShowAgain(context);
                dialog.dismiss();
            })
            .setCancelable(true)
            .show();
        
        Log.d(TAG, "显示WebView升级对话框");
    }

    /**
     * 构建升级消息
     */
    private static String buildUpgradeMessage(WebViewDetector.WebViewInfo info) {
        StringBuilder message = new StringBuilder();
        
        message.append("检测到您的浏览器内核版本较旧\n\n");
        message.append("当前版本: Chrome ").append(info.version).append("\n");
        message.append("质量评级: ").append(info.getQualityLevel()).append("\n\n");
        
        if (info.isUpdatable) {
            message.append("📱 升级方式: 通过应用商店更新\n");
            message.append("🚀 升级优势:\n");
            message.append("• 更快的页面加载速度\n");
            message.append("• 更好的网页兼容性\n");
            message.append("• 更强的安全保护\n");
            message.append("• 支持最新Web标准\n\n");
            message.append("升级后将显著改善您的使用体验！");
        } else {
            message.append("⚠️ 您的设备可能无法直接升级WebView\n\n");
            message.append("建议:\n");
            message.append("• 更新系统到最新版本\n");
            message.append("• 检查Google Play服务\n");
            message.append("• 联系设备厂商获取支持");
        }
        
        return message.toString();
    }

    /**
     * 打开WebView升级页面
     */
    private static void openWebViewUpgradePage(Context context, WebViewDetector.WebViewInfo info) {
        try {
            Intent intent = null;
            
            if (info.isGoogleChrome) {
                // 尝试打开Chrome的Play Store页面
                intent = new Intent(Intent.ACTION_VIEW, 
                    Uri.parse("market://details?id=com.android.chrome"));
            } else if (info.packageName.contains("webview")) {
                // 尝试打开Android System WebView的Play Store页面
                intent = new Intent(Intent.ACTION_VIEW, 
                    Uri.parse("market://details?id=com.google.android.webview"));
            }
            
            // 如果无法打开Play Store，则打开浏览器
            if (intent != null) {
                try {
                    context.startActivity(intent);
                    Log.d(TAG, "打开Play Store升级页面");
                    return;
                } catch (Exception e) {
                    Log.w(TAG, "无法打开Play Store: " + e.getMessage());
                }
            }
            
            // 降级方案：打开网页版Play Store
            Intent webIntent = new Intent(Intent.ACTION_VIEW, 
                Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview"));
            context.startActivity(webIntent);
            Log.d(TAG, "打开网页版Play Store");
            
        } catch (Exception e) {
            Log.e(TAG, "打开升级页面时发生错误: " + e.getMessage(), e);
            
            // 最终降级方案：显示手动升级指导
            showManualUpgradeGuide(context);
        }
    }

    /**
     * 显示手动升级指导
     */
    private static void showManualUpgradeGuide(Context context) {
        String guide = "手动升级指导:\n\n" +
                      "1. 打开Google Play商店\n" +
                      "2. 搜索\"Android System WebView\"\n" +
                      "3. 点击\"更新\"按钮\n" +
                      "4. 重启应用以生效\n\n" +
                      "如果找不到更新选项，请尝试:\n" +
                      "• 更新Google Play服务\n" +
                      "• 检查系统更新\n" +
                      "• 重启设备后再试";
        
        new AlertDialog.Builder(context)
            .setTitle("升级指导")
            .setMessage(guide)
            .setPositiveButton("我知道了", null)
            .show();
    }

    /**
     * 记录对话框已显示
     */
    private static void recordDialogShown(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putLong(KEY_LAST_SHOWN, System.currentTimeMillis())
            .apply();
    }

    /**
     * 设置不再显示
     */
    private static void setDontShowAgain(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_DONT_SHOW_AGAIN, true)
            .putLong(KEY_LAST_SHOWN, System.currentTimeMillis())
            .apply();
        
        Log.d(TAG, "用户选择不再显示升级对话框");
    }

    /**
     * 重置升级提醒设置（用于测试或重新启用提醒）
     */
    public static void resetUpgradeReminder(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .remove(KEY_DONT_SHOW_AGAIN)
            .remove(KEY_LAST_SHOWN)
            .apply();
        
        Log.d(TAG, "重置升级提醒设置");
    }

    /**
     * 强制显示升级对话框（用于测试）
     */
    public static void forceShowUpgradeDialog(Context context) {
        try {
            WebViewDetector.WebViewInfo info = WebViewDetector.getWebViewInfo(context);
            showUpgradeDialog(context, info);
        } catch (Exception e) {
            Log.e(TAG, "强制显示升级对话框时发生错误: " + e.getMessage(), e);
        }
    }
}

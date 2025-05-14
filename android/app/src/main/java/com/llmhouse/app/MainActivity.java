package com.llmhouse.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
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
}
